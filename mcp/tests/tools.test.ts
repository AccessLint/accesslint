import { describe, it, expect } from "vitest";

describe("list_rules pipeline", () => {
  it("returns active rules from core", async () => {
    const { getActiveRules } = await import("@accesslint/core");
    const rules = getActiveRules();
    expect(rules.length).toBeGreaterThan(0);

    // Every rule has required fields
    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(["A", "AA", "AAA"]).toContain(rule.level);
    }
  });

  it("filters rules by category", async () => {
    const { getActiveRules } = await import("@accesslint/core");
    const rules = getActiveRules().filter((r) => r.category === "aria");
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.id).toMatch(/^aria\//);
    }
  });
});
