import { describe, it, expect } from "vitest";
import { rules } from "../rules/index";
import { ACT_TO_CORE_RULES } from "./act-mapping";

describe("ACT_TO_CORE_RULES", () => {
  it("covers every actRuleId declared on a rule", () => {
    const declared = new Set<string>();
    for (const rule of rules) {
      for (const id of rule.actRuleIds ?? []) declared.add(id);
    }
    expect(new Set(Object.keys(ACT_TO_CORE_RULES))).toEqual(declared);
  });

  it("maps each ACT rule to every core rule that declares it", () => {
    for (const rule of rules) {
      for (const actId of rule.actRuleIds ?? []) {
        expect(ACT_TO_CORE_RULES[actId]).toContain(rule.id);
      }
    }
  });

  it("has no empty mappings", () => {
    for (const [actId, coreIds] of Object.entries(ACT_TO_CORE_RULES)) {
      expect(coreIds.length, `ACT ${actId} has no core rules`).toBeGreaterThan(0);
    }
  });
});
