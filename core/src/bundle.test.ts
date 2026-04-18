import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const distDir = resolve(__dirname, "../dist");
const bundlePath = resolve(distDir, "index.cjs");
const bundleExists = existsSync(bundlePath);

/**
 * Bundle size budgets (bytes). Set at ~10% above observed sizes at the
 * time of last tuning so growth is caught early. Bump deliberately when
 * a size increase is justified — surprise regressions fail CI.
 */
const SIZE_BUDGETS: Record<string, { raw: number; gzip: number }> = {
  "index.iife.js": { raw: 185_000, gzip: 50_000 },
  "index.cjs": { raw: 410_000, gzip: 100_000 },
  "index.js": { raw: 410_000, gzip: 100_000 },
  "index.d.ts": { raw: 12_000, gzip: 4_000 },
  "index.d.cts": { raw: 12_000, gzip: 4_000 },
};

describe.skipIf(!bundleExists)("bundle size budgets (requires npm run build)", () => {
  for (const [file, budget] of Object.entries(SIZE_BUDGETS)) {
    const path = resolve(distDir, file);
    it(`${file} stays within byte budget`, () => {
      const raw = statSync(path).size;
      const gzip = gzipSync(readFileSync(path)).length;
      expect(raw, `${file} raw size exceeded budget`).toBeLessThanOrEqual(budget.raw);
      expect(gzip, `${file} gzipped size exceeded budget`).toBeLessThanOrEqual(budget.gzip);
    });
  }
});

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
