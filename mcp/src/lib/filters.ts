import { getActiveRules } from "@accesslint/core";

export interface FilterOptions {
  rules?: string[];
  wcag?: string[];
  includeAAA?: boolean;
  existingDisabled?: string[];
}

/**
 * Convert user-facing `rules` / `wcag` allow-lists into a `disabledRules` list
 * by inverting against the active rule set. If neither filter is supplied,
 * returns the existing disabled list (or undefined) untouched so callers can
 * still pass through their own opt-outs.
 */
export function computeDisabledRules(options: FilterOptions): string[] | undefined {
  const { rules, wcag, includeAAA, existingDisabled } = options;
  if (!rules && !wcag) {
    return existingDisabled && existingDisabled.length > 0 ? existingDisabled : undefined;
  }

  const active = getActiveRules({ includeAAA });
  const allow = new Set<string>();
  if (rules) for (const id of rules) allow.add(id);
  if (wcag) {
    for (const r of active) {
      if (r.wcag.some((w) => wcag.includes(w))) allow.add(r.id);
    }
  }

  const disabled = new Set<string>(existingDisabled ?? []);
  for (const r of active) {
    if (!allow.has(r.id)) disabled.add(r.id);
  }

  return disabled.size > 0 ? Array.from(disabled) : undefined;
}

/**
 * Post-filter a violation list by WCAG criteria. Use when violations are
 * already collected (e.g. from diff_html or audit_browser_collect) and we
 * want to keep only those whose rule maps to the requested criteria.
 */
export function filterViolationsByWcag<T extends { ruleId: string }>(
  violations: T[],
  wcag: string[],
): T[] {
  const active = getActiveRules();
  const matchingIds = new Set<string>();
  for (const r of active) {
    if (r.wcag.some((w) => wcag.includes(w))) matchingIds.add(r.id);
  }
  return violations.filter((v) => matchingIds.has(v.ruleId));
}
