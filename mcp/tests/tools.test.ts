import { describe, it, expect, beforeEach } from "vitest";
import { audit, getStoredAudit, clearStoredAudits } from "../src/lib/state.js";
import { diffAudit } from "@accesslint/core";
import { formatViolations, formatDiff } from "../src/lib/format.js";

describe("audit_html pipeline", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("finds violations in an image without alt", () => {
    const result = audit('<img src="photo.jpg">');
    expect(result.violations.length).toBeGreaterThan(0);
    const imgAlt = result.violations.find((v) => v.ruleId === "text-alternatives/img-alt");
    expect(imgAlt).toBeDefined();
    expect(imgAlt!.impact).toBe("critical");
  });

  it("returns no violations for accessible HTML", () => {
    const result = audit('<img src="photo.jpg" alt="A sunset">');
    const imgAlt = result.violations.find((v) => v.ruleId === "text-alternatives/img-alt");
    expect(imgAlt).toBeUndefined();
  });

  it("auto-enables componentMode for fragments", () => {
    // A fragment without <html> should not trigger page-level rules like html-lang
    const result = audit("<p>Hello world</p>");
    const pageLevelViolation = result.violations.find((v) => v.ruleId === "readable/html-has-lang");
    expect(pageLevelViolation).toBeUndefined();
  });

  it("detects page-level violations in full documents", () => {
    const result = audit(
      "<!DOCTYPE html><html><head><title>Test</title></head><body><p>Hello</p></body></html>",
    );
    const htmlLang = result.violations.find((v) => v.ruleId === "readable/html-has-lang");
    expect(htmlLang).toBeDefined();
  });

  it("stores named audits for later diffing", () => {
    audit('<img src="photo.jpg">', { name: "before" });
    const stored = getStoredAudit("before");
    expect(stored).toBeDefined();
    expect(stored!.violations.length).toBeGreaterThan(0);
  });

  it("formats violations into readable text", () => {
    const result = audit('<img src="photo.jpg">');
    const text = formatViolations(result.violations);
    expect(text).toContain("accessibility violation");
    expect(text).toContain("text-alternatives/img-alt");
  });
});

describe("diff_html pipeline", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("shows fixed violations after correction", () => {
    const before = audit('<img src="photo.jpg">', { name: "before" });
    const after = audit('<img src="photo.jpg" alt="A photo">');
    const diff = diffAudit(before, after);

    expect(diff.fixed.length).toBeGreaterThan(0);
    const fixedImgAlt = diff.fixed.find((v) => v.ruleId === "text-alternatives/img-alt");
    expect(fixedImgAlt).toBeDefined();
  });

  it("shows new violations introduced", () => {
    const before = audit('<img src="photo.jpg" alt="A photo">', {
      name: "before",
    });
    const after = audit('<img src="other.jpg">');
    const diff = diffAudit(before, after);

    expect(diff.added.length).toBeGreaterThan(0);
  });

  it("formats diff output", () => {
    const before = audit('<img src="photo.jpg">', { name: "before" });
    const after = audit('<img src="photo.jpg" alt="A photo">');
    const diff = diffAudit(before, after);
    const text = formatDiff(diff);
    expect(text).toContain("fixed");
  });
});

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
