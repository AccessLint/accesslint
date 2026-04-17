import { describe, it, expect } from "vitest";
import { ACT_TO_CORE_RULES } from "./act-mapping";

describe("ACT_TO_CORE_RULES", () => {
  it("should have 44 entries derived from rule actRuleIds", () => {
    expect(Object.keys(ACT_TO_CORE_RULES).length).toBe(44);
  });

  it("should map ACT rule IDs to core rule IDs", () => {
    expect(ACT_TO_CORE_RULES["23a2a8"]).toContain("text-alternatives/img-alt");
    expect(ACT_TO_CORE_RULES["674b10"]).toContain("aria/aria-roles");
    expect(ACT_TO_CORE_RULES["c487ae"]).toContain("navigable/link-name");
  });
});
