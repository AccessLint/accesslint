import { describe, it, expect } from "vitest";
import { ACT_TO_CORE_RULE } from "./act-mapping";

describe("ACT_TO_CORE_RULE", () => {
  it("should have 44 entries derived from rule actRuleIds", () => {
    expect(Object.keys(ACT_TO_CORE_RULE).length).toBe(44);
  });

  it("should map ACT rule IDs to core rule IDs", () => {
    expect(ACT_TO_CORE_RULE["23a2a8"]).toBe("text-alternatives/img-alt");
    expect(ACT_TO_CORE_RULE["674b10"]).toBe("aria/aria-roles");
    expect(ACT_TO_CORE_RULE["c487ae"]).toBe("navigable/link-name");
  });
});
