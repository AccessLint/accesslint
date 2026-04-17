import { describe, it, expect } from "vitest";
import { audit, isHTMLFragment } from "./audit";

describe("isHTMLFragment", () => {
  it("detects a full document by doctype", () => {
    expect(isHTMLFragment("<!DOCTYPE html><html><body></body></html>")).toBe(false);
  });

  it("detects a full document by html tag", () => {
    expect(isHTMLFragment("<html><body></body></html>")).toBe(false);
  });

  it("treats bare markup as a fragment", () => {
    expect(isHTMLFragment('<div><img src="x.jpg"></div>')).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isHTMLFragment("<!doctype html><HTML></HTML>")).toBe(false);
  });
});

describe("audit", () => {
  it("returns violations for an obviously broken fragment", () => {
    const result = audit('<img src="x.jpg">');
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations.some((v) => v.ruleId.includes("img-alt"))).toBe(true);
  });

  it("returns no violations for well-formed markup", () => {
    const result = audit('<img src="x.jpg" alt="descriptive text">');
    expect(result.violations.some((v) => v.ruleId.includes("img-alt"))).toBe(false);
  });

  it("audits a full document with the document-level rules enabled", () => {
    const result = audit(
      '<!DOCTYPE html><html lang="en"><head><title>Hi</title></head><body><h1>Hi</h1></body></html>',
    );
    expect(result).toMatchObject({ ruleCount: expect.any(Number), violations: expect.any(Array) });
  });

  it("respects disabledRules", () => {
    const base = audit('<img src="x.jpg">');
    const ruleId = base.violations.find((v) => v.ruleId.endsWith("/img-alt"))?.ruleId;
    expect(ruleId).toBeDefined();
    const filtered = audit('<img src="x.jpg">', { disabledRules: [ruleId!] });
    expect(filtered.violations.some((v) => v.ruleId === ruleId)).toBe(false);
  });

  it("strips element references from violations (serializability)", () => {
    const result = audit('<img src="x.jpg">');
    for (const v of result.violations) {
      expect(v).not.toHaveProperty("element");
    }
  });
});
