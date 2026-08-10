import { clearAllCaches, getRuleById, runAudit, type AuditOptions } from "@accesslint/core";
import type { Violation } from "@accesslint/core";
import { MARKER_ATTRIBUTE, type NodeMeta } from "./emit";
import { renderJsx } from "./jsx";
import { wrapped, type SourceTree } from "./render";
import { nonDomRenderer, testFile } from "./scope";
import {
  attributeDependencies,
  CHILD_DEPENDENT_RULES,
  DEPENDS_ON_ANY_UNKNOWN,
  DIRECT_CHILD_RULES,
  DOC_ORDER_DEPENDENT_RULES,
  FRAGMENT_DISABLED_RULES,
  HTML_ELEMENT_RULE,
  NAME_FAMILY_RULES,
  SOURCE_MODE_DISABLED_RULES,
  TABLE_CONTAINER_RULES,
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

  const skipped = outOfScope(options);
  if (skipped) {
    return { findings: [], candidates: [], dialect, parsed: true, html: "", skipped };
  }

  const render = renderJsx(options.source, { typescript: dialect === "tsx" });
  if (!render) {
    return { findings: [], candidates: [], dialect, parsed: false, html: "" };
  }

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

  const doc = options.document;
  const findings: SourceFinding[] = [];
  const candidates: SourceCandidate[] = [];
  const documents: string[] = [];

  // One document per root. See SourceTree for why they cannot share one.
  for (const tree of render.trees) {
    const installed = install(doc, tree, render.nodes);
    const { metaByElement } = installed;
    documents.push(clean(doc.documentElement.innerHTML));

    clearAllCaches();
    const violations = [...runAudit(doc, auditOptions).violations];

    // The lone page-level carve-out: a file with a literal intrinsic `<html>` can
    // honestly be asked whether it set a lang. componentMode dropped the rule, so
    // it runs on its own.
    if (tree.htmlNodeIndex !== null && !disabled.has(HTML_ELEMENT_RULE)) {
      const rule = getRuleById(HTML_ELEMENT_RULE);
      if (rule) violations.push(...rule.run(doc));
    }

    for (const violation of violations) {
      const element = locate(violation, installed);
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
        message: clean(violation.message),
        context: violation.context ? clean(violation.context) : undefined,
        html: clean(violation.html),
        selector: violation.selector,
        line: anchor.line,
        column: anchor.column,
        file: options.filename,
      };

      const unknown = unprovable(violation, element, own ?? anchor, installed);
      if (unknown) candidates.push({ ...finding, unknown });
      else findings.push(finding);
    }
  }

  findings.sort(byPosition);
  candidates.sort(byPosition);
  const html = documents.join("\n");

  return { findings, candidates, dialect, parsed: true, html };
}

/**
 * Why this file has nothing to answer for, or null when it does. Both reasons
 * are about the file as a whole, so they are decided before it is even parsed.
 */
function outOfScope(options: AuditSourceOptions): SourceAuditResult["skipped"] {
  if (nonDomRenderer(options.source, options.filename)) return "non-dom-renderer";
  if (!options.includeTestFiles && testFile(options.filename)) return "test-file";
  return undefined;
}

function byPosition(a: SourceFinding, b: SourceFinding): number {
  return a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId);
}

interface Installed {
  doc: Document;
  tree: SourceTree;
  metaByElement: Map<Element, NodeMeta>;
  elementByIndex: Map<number, Element>;
}

/**
 * Write the synthetic document and read the node table out of the marker
 * attributes.
 *
 * The markers stay on the elements through the audit, and that is deliberate: a
 * rule that reports by CSS selector can hand back a selector that matches more
 * than one element — `<a href={blog}>` and `<a href={docs}>` both render
 * `href="unknown"`, so both get the same selector and the first one wins. Every
 * finding then lands on the wrong line. The marker is exact, and it comes back in
 * the violation's own HTML snippet. `clean` strips it from everything a caller
 * ever reads.
 */
function install(doc: Document, tree: SourceTree, nodes: NodeMeta[]): Installed {
  const root = doc.documentElement;
  for (const name of root.getAttributeNames()) root.removeAttribute(name);
  root.innerHTML = `<head>${tree.headHtml}</head><body>${wrapped(tree)}</body>`;

  for (const [name, value] of tree.htmlAttributes) {
    try {
      root.setAttribute(name, value);
    } catch {
      // An expression-named attribute is not a name the DOM accepts; skip it.
    }
  }
  if (tree.htmlNodeIndex !== null) {
    root.setAttribute(MARKER_ATTRIBUTE, String(tree.htmlNodeIndex));
  }

  // Walked rather than queried: a plain tree walk asks nothing of the host's
  // selector engine, which not every DOM implementation gets right for attribute
  // selectors.
  const metaByElement = new Map<Element, NodeMeta>();
  const elementByIndex = new Map<number, Element>();
  const visit = (element: Element): void => {
    const marker = element.getAttribute(MARKER_ATTRIBUTE);
    if (marker !== null) {
      const index = Number(marker);
      const meta = nodes[index];
      if (meta) {
        metaByElement.set(element, meta);
        elementByIndex.set(index, element);
      }
    }
    for (const child of element.children) visit(child);
  };
  visit(root);
  return { doc, tree, metaByElement, elementByIndex };
}

/** The marker as it appears at the front of an element's own HTML snippet. */
const MARKED_SNIPPET = new RegExp(`^<[a-z][a-z0-9-]*\\s+${MARKER_ATTRIBUTE}="(\\d+)"`);
const MARKER_PATTERN = new RegExp(`\\s?${MARKER_ATTRIBUTE}="\\d+"`, "g");

/** Everything a caller reads comes back with nothing of ours in it. */
function clean(text: string): string {
  return text.replace(MARKER_PATTERN, "");
}

/**
 * The element a violation is about. Its marker comes first: the snippet a rule
 * quotes is the element's own HTML, so the marker in it is proof of identity,
 * where a selector is only a guess that happens to be unique most of the time.
 */
function locate(violation: Violation, installed: Installed): Element | null {
  const marked = MARKED_SNIPPET.exec(violation.html);
  if (marked) {
    const element = installed.elementByIndex.get(Number(marked[1]));
    if (element) return element;
  }
  if (violation.element) return violation.element;
  try {
    return installed.doc.querySelector(violation.selector);
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

/** Which element a rule reads the contents of: the subject, or its container. */
function containerFor(ruleId: string, element: Element): Element | null {
  // Container integrity rules report the container itself. Only the table rules
  // report a cell and read the table around it.
  return TABLE_CONTAINER_RULES.has(ruleId) ? element.closest("table") : element;
}

/**
 * The unknown that stops this violation from being a finding, or null when the
 * source pins down everything the rule read.
 */
function unprovable(
  violation: Violation,
  element: Element,
  meta: NodeMeta,
  installed: Installed,
): SourceUnknown | null {
  const { doc, tree, metaByElement } = installed;
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
    // Most of these rules report the container itself; the table rules report a
    // cell, and then it is the surrounding table's unknowns that decide.
    const containerElement = containerFor(violation.ruleId, element);
    const container = containerElement ? metaByElement.get(containerElement) : undefined;
    if (!container) {
      // No container of the author's: either the fragment's parent is in the file
      // that renders it, or it is the `<table>` we invented to make a lone `<tr>`
      // parseable. Either way the question belongs to another file.
      return {
        kind: "external-container",
        detail: `the ${containerElement ? containerElement.tagName.toLowerCase() : "container"} this rule reads is not in this file`,
      };
    }
    // Container integrity reads one level down; everything else — every
    // accessible name, every table's cells — reads the whole subtree.
    const unknown = DIRECT_CHILD_RULES.has(violation.ruleId)
      ? container.unknowableChild
      : container.unknownContent;
    if (unknown) {
      return { kind: unknown.kind, expression: unknown.expression, detail: unknown.detail };
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

  // Both arms of a conditional are emitted, so document order inside this
  // component is not an order any user ever sees. (Order *between* components
  // never arises: each root is audited on its own.)
  if (DOC_ORDER_DEPENDENT_RULES.has(violation.ruleId) && tree.hasBranch) {
    return {
      kind: "exclusive-branches",
      detail: "this component emits exclusive branches, so document order is not a real order",
    };
  }

  return null;
}
