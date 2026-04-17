import { rules } from "../rules/index";

/**
 * Mapping from W3C ACT rule IDs to @accesslint/core rule IDs.
 * Derived from `actRuleIds` declared on each rule definition.
 *
 * One ACT rule can map to multiple core rules (e.g. ACT 23a2a8
 * "Image has non-empty accessible name" maps to both img-alt and
 * role-img-alt), so values are arrays.
 */
function buildActToCoreRules(): Record<string, string[]> {
  const mapping: Record<string, string[]> = {};
  for (const rule of rules) {
    if (!rule.actRuleIds) continue;
    for (const actId of rule.actRuleIds) {
      (mapping[actId] ??= []).push(rule.id);
    }
  }
  return mapping;
}

export const ACT_TO_CORE_RULES: Record<string, string[]> = buildActToCoreRules();
