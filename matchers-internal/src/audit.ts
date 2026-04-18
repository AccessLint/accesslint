/**
 * Shared audit helpers used by every matcher package.
 *
 * The module exports both runtime-agnostic utilities (types, constants,
 * formatting, impact filtering) and Node-DOM wrappers that bridge to
 * `@accesslint/core`'s `runAudit`. Matcher packages that run audits
 * remotely (e.g. @accesslint/playwright, which executes `runAudit` inside
 * the browser page) import only the runtime-agnostic utilities from here;
 * the unused DOM wrappers are tree-shaken from their bundles.
 */
import { getRuleById, getSelector, querySelectorShadowAware, runAudit } from "@accesslint/core";
import type { Rule, Violation } from "@accesslint/core";

export type Impact = "critical" | "serious" | "moderate" | "minor";

export const IMPACT_RANK: Record<Impact, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

/**
 * Option shape shared between matcher packages. Packages extend this with
 * platform-specific fields — e.g. jest/vitest add `additionalRules` (which
 * requires the Node-DOM runner), Playwright adds `includeFrames` /
 * `includeShadowDom`.
 */
export interface BaseAccessibleMatcherOptions {
  /** Rule IDs to disable for this assertion. */
  disabledRules?: string[];
  /** Include AAA-level rules (excluded by default). */
  includeAAA?: boolean;
  /**
   * Skip page-level rules (html-has-lang, document-title, landmarks, etc.)
   * that don't apply to components rendered in isolation.
   */
  componentMode?: boolean;
  /** Locale for translated rule messages (e.g. "en", "es"). */
  locale?: string;
  /**
   * Minimum impact that causes the assertion to fail.
   * Violations below the threshold are ignored.
   */
  failOn?: Impact;
}

export interface AccessibleMatcherOptions extends BaseAccessibleMatcherOptions {
  /**
   * Additional rules to run on top of the built-in set. Only supported by
   * matcher packages that run the audit in-process (jest, vitest). Packages
   * that run audits remotely (playwright) omit this from their option type.
   */
  additionalRules?: Rule[];
}

export interface SnapshotMatcherOptions extends AccessibleMatcherOptions {
  /** Name of the snapshot file (e.g. "login-form"). */
  snapshot?: string;
  /** Directory to store snapshot files. Defaults to `{cwd}/accessibility-snapshots`. */
  snapshotDir?: string;
}

// ---------------------------------------------------------------------------
// Runtime-agnostic helpers — safe for remote-audit matcher packages to import.
// ---------------------------------------------------------------------------

/** Sort violations by impact, most severe first. Does not mutate the input. */
export function sortByImpact<T extends { impact: Impact }>(violations: T[]): T[] {
  return [...violations].sort((a, b) => IMPACT_RANK[b.impact] - IMPACT_RANK[a.impact]);
}

/** Filter out violations below the `failOn` threshold. */
export function applyFailOnFilter<T extends { impact: Impact }>(
  violations: T[],
  failOn: Impact | undefined,
): T[] {
  if (!failOn) return violations;
  const threshold = IMPACT_RANK[failOn];
  return violations.filter((v) => IMPACT_RANK[v.impact] >= threshold);
}

/**
 * Format a violation into the shared failure-message block used by all
 * matcher packages. Pulls WCAG / level / guidance from rule metadata.
 */
export function formatViolation(
  v: Violation,
  options?: { locale?: string; additionalRules?: Rule[] },
): string {
  const rule = getRuleById(v.ruleId, options);
  const parts: string[] = [];
  if (rule?.wcag?.length) parts.push(`WCAG ${rule.wcag.join(", ")}`);
  if (rule?.level) parts.push(rule.level);
  const meta = parts.length ? ` (${parts.join(", ")})` : "";

  const lines: string[] = [];
  lines.push(`  [${v.impact}] ${v.ruleId}${meta} — ${v.message}`);
  lines.push(`    selector: ${v.selector}`);
  if (v.context) lines.push(`    context: ${v.context}`);
  if (v.fix) lines.push(`    fix: ${formatFix(v.fix)}`);
  if (rule?.guidance) lines.push(`    guidance: ${rule.guidance}`);
  return lines.join("\n");
}

function formatFix(fix: NonNullable<Violation["fix"]>): string {
  switch (fix.type) {
    case "add-attribute":
    case "set-attribute":
      return `${fix.type} ${fix.attribute}="${fix.value}"`;
    case "remove-attribute":
      return `remove-attribute ${fix.attribute}`;
    case "add-element":
      return `add-element <${fix.tag}> under ${fix.parent}`;
    case "remove-element":
      return "remove-element";
    case "add-text-content":
      return fix.text ? `add text: "${fix.text}"` : "add text content";
    case "suggest":
      return fix.suggestion;
  }
}

// ---------------------------------------------------------------------------
// Node-DOM wrappers — used by @accesslint/jest and @accesslint/vitest.
// Remote-audit packages tree-shake these out of their bundles.
// ---------------------------------------------------------------------------

export interface AuditInput {
  doc: Document;
  disabledRules?: string[];
  additionalRules?: Rule[];
  includeAAA?: boolean;
  componentMode?: boolean;
  locale?: string;
}

/** Keys that change which violations come out of the audit (vs post-filtering). */
export function auditCacheKey(input: AuditInput): string {
  return JSON.stringify({
    disabledRules: input.disabledRules ?? [],
    additionalRuleIds: (input.additionalRules ?? []).map((r) => r.id),
    includeAAA: !!input.includeAAA,
    componentMode: !!input.componentMode,
    locale: input.locale ?? "",
  });
}

export function runScopedAudit(input: AuditInput): Violation[] {
  return runAudit(input.doc, {
    disabledRules: input.disabledRules,
    additionalRules: input.additionalRules,
    includeAAA: input.includeAAA,
    componentMode: input.componentMode,
    locale: input.locale,
  }).violations;
}

/**
 * Compute the full set of violations for an element, honoring matcher options.
 * Callers may pre-supply `cachedViolations` to reuse an already-run audit.
 */
export function auditElement(
  el: Element,
  options?: AccessibleMatcherOptions,
  cachedViolations?: Violation[],
): Violation[] {
  const doc = el.ownerDocument;
  if (!doc) return [];

  const componentMode = options?.componentMode ?? el !== doc.documentElement;

  const all =
    cachedViolations ??
    runScopedAudit({
      doc,
      disabledRules: options?.disabledRules,
      additionalRules: options?.additionalRules,
      includeAAA: options?.includeAAA,
      componentMode,
      locale: options?.locale,
    });

  return applyFailOnFilter(scopeViolationsToElement(all, el), options?.failOn);
}

export function resolvedAuditInput(
  el: Element,
  options?: AccessibleMatcherOptions,
): AuditInput | null {
  const doc = el.ownerDocument;
  if (!doc) return null;
  return {
    doc,
    disabledRules: options?.disabledRules,
    additionalRules: options?.additionalRules,
    includeAAA: options?.includeAAA,
    componentMode: options?.componentMode ?? el !== doc.documentElement,
    locale: options?.locale,
  };
}

function scopeViolationsToElement(violations: Violation[], root: Element): Violation[] {
  return violations.filter((v) => {
    if (v.element) return isInside(v.element, root);
    try {
      const el = querySelectorShadowAware(v.selector);
      return el ? isInside(el, root) : false;
    } catch {
      return false;
    }
  });
}

function isInside(target: Node, root: Element): boolean {
  let node: Node | null = target;
  while (node) {
    if (node === root) return true;
    const parent: Node | null = node.parentNode;
    if (parent) {
      node = parent;
      continue;
    }
    // Walk out of a shadow root to its host.
    const host: Element | undefined = (node as ShadowRoot).host;
    if (host) {
      node = host;
      continue;
    }
    return false;
  }
  return false;
}

export function stableSelector(v: Violation): string {
  return v.element ? getSelector(v.element) : v.selector;
}
