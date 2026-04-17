import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const bundlePath = resolve(__dirname, "../dist/index.cjs");
const bundleExists = existsSync(bundlePath);

describe.skipIf(!bundleExists)("CJS bundle smoke test (requires npm run build)", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundle = bundleExists ? require(bundlePath) : null;

  it("exports runAudit", () => {
    expect(typeof bundle.runAudit).toBe("function");
  });

  it("exports rules array", () => {
    expect(Array.isArray(bundle.rules)).toBe(true);
    expect(bundle.rules.length).toBeGreaterThan(0);
  });

  it("exports utility functions", () => {
    expect(typeof bundle.getAccessibleName).toBe("function");
    expect(typeof bundle.getComputedRole).toBe("function");
    expect(typeof bundle.isAriaHidden).toBe("function");
  });

  it("runAudit detects a missing img alt violation", () => {
    const doc = new DOMParser().parseFromString(`<img src="x.png">`, "text/html");
    const result = bundle.runAudit(doc);
    expect(
      result.violations.some((v: { ruleId: string }) => v.ruleId === "text-alternatives/img-alt"),
    ).toBe(true);
  });

  it("runAudit returns no violations for a clean document", () => {
    const doc = new DOMParser().parseFromString(
      `<html lang="en"><head><title>Test</title></head><body><main><h1>Hello</h1></main></body></html>`,
      "text/html",
    );
    const result = bundle.runAudit(doc);
    expect(result.violations).toHaveLength(0);
  });

  it("compileDeclarativeRule produces a working rule", () => {
    const rule = bundle.compileDeclarativeRule({
      id: "test/no-marquee",
      selector: "marquee",
      check: { type: "selector-exists" },
      impact: "serious",
      message: "Do not use <marquee>.",
      description: "No marquee",
      wcag: ["2.2.2"],
      level: "A",
    });
    const passing = new DOMParser().parseFromString(`<p>Text</p>`, "text/html");
    const failing = new DOMParser().parseFromString(`<marquee>Spin</marquee>`, "text/html");
    expect(rule.run(passing)).toHaveLength(0);
    expect(rule.run(failing)).toHaveLength(1);
  });
});
