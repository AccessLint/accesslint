import { expect } from "vitest";
import type { Rule, Violation } from "./rules/types";

export function makeDoc(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

export interface ExpectViolationsOptions {
  count?: number;
  ruleId?: string;
  impact?: Violation["impact"];
  selectorIncludes?: string | string[];
  messageMatches?: RegExp;
  contextMatches?: RegExp;
}

/**
 * Run a rule against `html` and assert on the resulting violations.
 *
 * Passing `count: 0` (or omitting `count`) asserts no violations. Any other
 * option asserts on the first violation's shape; pass `selectorIncludes` as
 * an array to assert one match per selector substring in order.
 */
export function expectViolations(
  rule: Rule,
  html: string,
  options: ExpectViolationsOptions = {},
): Violation[] {
  const doc = makeDoc(html);
  const violations = rule.run(doc);
  const { count, ruleId, impact, selectorIncludes, messageMatches, contextMatches } = options;

  if (count !== undefined) {
    const detail = violations.map((v) => `${v.selector} — ${v.message}`).join("; ");
    expect(
      violations,
      `expected ${count} violations, got ${violations.length}: ${detail}`,
    ).toHaveLength(count);
  }

  if (violations.length === 0) return violations;

  const first = violations[0];
  if (ruleId !== undefined) expect(first.ruleId).toBe(ruleId);
  if (impact !== undefined) expect(first.impact).toBe(impact);
  if (messageMatches !== undefined) expect(first.message).toMatch(messageMatches);
  if (contextMatches !== undefined) expect(first.context ?? "").toMatch(contextMatches);

  if (selectorIncludes !== undefined) {
    const needles = Array.isArray(selectorIncludes) ? selectorIncludes : [selectorIncludes];
    for (const needle of needles) {
      expect(
        violations.some((v) => v.selector?.includes(needle)),
        `expected a violation whose selector includes "${needle}"; got: ${violations.map((v) => v.selector).join(", ")}`,
      ).toBe(true);
    }
  }

  return violations;
}

/** Shorthand: assert the rule produces no violations for `html`. */
export function expectNoViolations(rule: Rule, html: string): void {
  expectViolations(rule, html, { count: 0 });
}
