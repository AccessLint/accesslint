import { rules } from "../rules/index";

/**
 * Mapping from W3C ACT rule IDs to @accesslint/core rule IDs.
 * Derived from `actRuleIds` declared on each rule definition.
 */
function buildActToCoreRule(): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const rule of rules) {
    if (rule.actRuleIds) {
      for (const actId of rule.actRuleIds) {
        mapping[actId] ??= rule.id;
      }
    }
  }
  return mapping;
}

export const ACT_TO_CORE_RULE: Record<string, string> = buildActToCoreRule();
