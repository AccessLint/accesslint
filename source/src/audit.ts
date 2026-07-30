import { clearAllCaches, getRuleById, runAudit, type AuditOptions } from "@accesslint/core";
import type { Violation } from "@accesslint/core";
import { MARKER_ATTRIBUTE, type NodeMeta } from "./emit";
import { renderJsx } from "./jsx";
import type { SourceRender } from "./render";
import {
  attributeDependencies,
  CHILD_DEPENDENT_RULES,
  CONTAINER_MEMBER_RULES,
  DEPENDS_ON_ANY_UNKNOWN,
  DOC_ORDER_DEPENDENT_RULES,
  FRAGMENT_DISABLED_RULES,
  HTML_ELEMENT_RULE,
  NAME_FAMILY_RULES,
  SOURCE_MODE_DISABLED_RULES,
} from "./semantics";
import type {
  AuditSourceOptions,
  Dialect,
  SourceAuditResult,
  SourceCandidate,
  SourceFinding,
  SourceUnknown,
} from "./types";

/** The dialect a filename names, or null when it names none of ours. */
export function detectDialect(filename?: string): Dialect | null {
  if (!filename) return null;
  if (/\.tsx$/i.test(filename)) return "tsx";
  if (/\.jsx$/i.test(filename)) return "jsx";
  return null;
}

/**
 * Audit a component file. Findings are violations the source proves; candidates
 * are violations the engine reported that the source cannot prove, each carrying
 * the unknown that stopped it. Only findings are safe to post as review
 * comments.
 */
export function auditSource(options: AuditSourceOptions): SourceAuditResult {
  // No filename and no dialect: parse as TSX, the superset that also reads JSX.
  const dialect = options.dialect ?? detectDialect(options.filename) ?? "tsx";
  const render = renderJsx(options.source, { typescript: dialect === "tsx" });
  if (!render) {
    return { findings: [], candidates: [], dialect, parsed: false, html: "" };
  }

  const doc = options.document;
  const metaByElement = install(doc, render);
  const html = doc.documentElement.innerHTML;

  const disabled = new Set<string>([
    ...SOURCE_MODE_DISABLED_RULES,
    ...FRAGMENT_DISABLED_RULES,
    ...(options.auditOptions?.disabledRules ?? []),
  ]);
  const auditOptions: AuditOptions = {
    ...options.auditOptions,
    disabledRules: [...disabled],
    componentMode: true,
  };

  clearAllCaches();
  const violations = [...runAudit(doc, auditOptions).violations];

  // The lone page-level carve-out: a file with a literal intrinsic `<html>` can
  // honestly be asked whether it set a lang. componentMode dropped the rule, so
  // it runs on its own.
  if (render.htmlNodeIndex !== null && !disabled.has(HTML_ELEMENT_RULE)) {
    const rule = getRuleById(HTML_ELEMENT_RULE);
    if (rule) violations.push(...rule.run(doc));
  }

  const findings: SourceFinding[] = [];
  const candidates: SourceCandidate[] = [];

  for (const violation of violations) {
    const element = elementFor(doc, violation);
    if (!element) continue;

    const own = metaByElement.get(element);
    const anchor = own ?? nearestMeta(element, metaByElement);
    // Nothing this package emitted: not a claim about the source, so not ours
    // to report. Same posture as the ERB path dropping a violation it cannot
    // place on a line.
    if (!anchor) continue;

    const finding: SourceFinding = {
      ruleId: violation.ruleId,
      impact: violation.impact,
      message: violation.message,
      context: violation.context,
      html: violation.html,
      selector: violation.selector,
      line: anchor.line,
      column: anchor.column,
      file: options.filename,
    };

    const unknown = unprovable(violation, element, own ?? anchor, doc, metaByElement, render);
    if (unknown) candidates.push({ ...finding, unknown });
    else findings.push(finding);
  }

  findings.sort(byPosition);
  candidates.sort(byPosition);

  return { findings, candidates, dialect, parsed: true, html };
}

function byPosition(a: SourceFinding, b: SourceFinding): number {
  return a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId);
}

/**
 * Write the synthetic document, then read the node table out of the marker
 * attributes and remove them. The engine — and every HTML snippet it quotes
 * back into a review comment — sees a document with nothing of ours in it.
 */
function install(doc: Document, render: SourceRender): Map<Element, NodeMeta> {
  const root = doc.documentElement;
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  root.innerHTML = `<head>${render.headHtml}</head><body>${render.bodyHtml}</body>`;

  for (const [name, value] of render.htmlAttributes) {
    try {
      root.setAttribute(name, value);
    } catch {
      // An expression-named attribute is not a name the DOM accepts; skip it.
    }
  }
  if (render.htmlNodeIndex !== null) {
    root.setAttribute(MARKER_ATTRIBUTE, String(render.htmlNodeIndex));
  }

  // Walked rather than queried: a plain tree walk asks nothing of the host's
  // selector engine, which not every DOM implementation gets right for attribute
  // selectors.
  const metaByElement = new Map<Element, NodeMeta>();
  const visit = (element: Element): void => {
    const marker = element.getAttribute(MARKER_ATTRIBUTE);
    if (marker !== null) {
      element.removeAttribute(MARKER_ATTRIBUTE);
      const meta = render.nodes[Number(marker)];
      if (meta) metaByElement.set(element, meta);
    }
    for (const child of element.children) visit(child);
  };
  visit(root);
  return metaByElement;
}

/** Rules report an element directly or by selector; either way we need it. */
function elementFor(doc: Document, violation: Violation): Element | null {
  if (violation.element) return violation.element;
  try {
    return doc.querySelector(violation.selector);
  } catch {
    return null;
  }
}

function nearestMeta(
  element: Element,
  metaByElement: Map<Element, NodeMeta>,
): NodeMeta | undefined {
  let current: Element | null = element.parentElement;
  while (current) {
    const meta = metaByElement.get(current);
    if (meta) return meta;
    current = current.parentElement;
  }
  return undefined;
}

/**
 * The attribute-shaped unknowns for one rule on one element: an expression value
 * for an attribute the rule reads, and the spread calculus — a spread means the
 * rule's attributes are only known where the source writes them *after* the
 * spread, since a spread can supply what the element does not name.
 */
function attributeUnknown(meta: NodeMeta, ruleId: string): SourceUnknown | null {
  const dependencies = attributeDependencies(ruleId);

  for (const [attribute, unknown] of meta.unknownAttributes) {
    if (dependencies !== DEPENDS_ON_ANY_UNKNOWN && !dependencies.includes(attribute)) continue;
    if (unknown.cause === "spread") {
      return {
        kind: "spread",
        attribute,
        expression: unknown.expression,
        detail: `${attribute} is written before {...${unknown.expression}}, which can override it`,
      };
    }
    return {
      kind: "unknown-attribute-value",
      attribute,
      expression: unknown.expression,
      detail: `${attribute} is set from \`${unknown.expression}\`, so its value is unknown here`,
    };
  }

  if (!meta.spread) return null;
  if (dependencies === DEPENDS_ON_ANY_UNKNOWN) {
    return {
      kind: "spread",
      expression: meta.spread.expression,
      detail: `<${meta.tag}> spreads {...${meta.spread.expression}}, which may carry attributes this file does not name`,
    };
  }
  for (const attribute of dependencies) {
    if (meta.pinnedAfterSpread.has(attribute)) continue;
    return {
      kind: "spread",
      attribute,
      expression: meta.spread.expression,
      detail: `{...${meta.spread.expression}} may supply ${attribute}, which this file does not set after it`,
    };
  }
  return null;
}

/** Where the container is, for a rule that reports one of its members. */
function containerFor(
  ruleId: string,
  element: Element,
  metaByElement: Map<Element, NodeMeta>,
): NodeMeta | undefined {
  const location = CONTAINER_MEMBER_RULES[ruleId];
  if (!location) return metaByElement.get(element);
  const container = location === "parent" ? element.parentElement : element.closest("table");
  return container ? metaByElement.get(container) : undefined;
}

/**
 * The unknown that stops this violation from being a finding, or null when the
 * source pins down everything the rule read.
 */
function unprovable(
  violation: Violation,
  element: Element,
  meta: NodeMeta,
  doc: Document,
  metaByElement: Map<Element, NodeMeta>,
  render: SourceRender,
): SourceUnknown | null {
  // An element whose own hiding is unknown may not be in the accessibility tree
  // at all, and neither may anything under it.
  for (let node: Element | null = element; node; node = node.parentElement) {
    const hidden = metaByElement.get(node)?.subtreeUnknown;
    if (hidden) {
      return {
        kind: "unknown-semantics",
        attribute: hidden.attribute,
        expression: hidden.expression,
        detail: `${hidden.attribute}={${hidden.expression}} may remove this from the accessibility tree`,
      };
    }
  }

  const attributes = attributeUnknown(meta, violation.ruleId);
  if (attributes) return attributes;

  if (CHILD_DEPENDENT_RULES.has(violation.ruleId)) {
    // Most of these rules report the container itself; the container-member
    // rules report the offending child, and then it is the container's unknowns
    // that decide.
    const container = containerFor(violation.ruleId, element, metaByElement) ?? meta;
    if (container.unknowableChild) {
      return {
        kind: container.unknowableChild.kind,
        expression: container.unknowableChild.expression,
        detail: container.unknowableChild.detail,
      };
    }
    const containerAttributes = attributeUnknown(container, violation.ruleId);
    if (containerAttributes) return containerAttributes;
  }

  // A component is normally named by the page that renders it, so an
  // aria-labelledby target this file does not define is not a missing name.
  if (NAME_FAMILY_RULES.has(violation.ruleId)) {
    const labelledby = element.getAttribute("aria-labelledby");
    const missing = (labelledby ?? "").split(/\s+/).filter((id) => id && !doc.getElementById(id));
    if (missing.length > 0) {
      return {
        kind: "external-idref",
        attribute: "aria-labelledby",
        expression: missing.join(" "),
        detail: `aria-labelledby points at ${missing.join(", ")}, which this file does not define`,
      };
    }
  }

  // Both arms of a conditional are emitted, and so is every component in the
  // file, so document order here is not an order any user ever sees.
  if (
    DOC_ORDER_DEPENDENT_RULES.has(violation.ruleId) &&
    (render.hasBranch || render.rootCount > 1)
  ) {
    return {
      kind: "exclusive-branches",
      detail: render.hasBranch
        ? "this file emits exclusive branches, so document order is not a real order"
        : "this file defines several independent trees, so document order is not a real order",
    };
  }

  return null;
}
