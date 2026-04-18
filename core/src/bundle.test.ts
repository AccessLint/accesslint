import { beforeAll, describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const distDir = resolve(__dirname, "../dist");
const bundlePath = resolve(distDir, "index.cjs");
const esmPath = resolve(distDir, "index.js");
const iifePath = resolve(distDir, "index.iife.js");

// Fail fast with a clear message if dist/ isn't present. Turbo's test task
// dependsOn build, so this should never happen in a correctly wired run;
// if it does, the gate surfaces the misconfiguration loudly instead of
// silently skipping every test in this file.
if (!existsSync(bundlePath)) {
  throw new Error(
    `Bundle tests require ${bundlePath} — run 'turbo run build --filter=@accesslint/core' first.`,
  );
}

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

describe("bundle size budgets", () => {
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

describe("CJS bundle smoke test", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundle = require(bundlePath);

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

describe("ESM bundle smoke test", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let esm: any;
  beforeAll(async () => {
    esm = await import(/* @vite-ignore */ pathToFileURL(esmPath).href);
  });

  it("exports runAudit", () => {
    expect(typeof esm.runAudit).toBe("function");
  });

  it("exports rules array", () => {
    expect(Array.isArray(esm.rules)).toBe(true);
    expect(esm.rules.length).toBeGreaterThan(0);
  });

  it("runAudit works against a missing img alt document", () => {
    const doc = new DOMParser().parseFromString(`<img src="x.png">`, "text/html");
    const result = esm.runAudit(doc);
    expect(
      result.violations.some((v: { ruleId: string }) => v.ruleId === "text-alternatives/img-alt"),
    ).toBe(true);
  });
});

describe("ESM/CJS export parity", () => {
  it("exposes the same export names in both formats", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cjs = require(bundlePath);
    const esm = await import(/* @vite-ignore */ pathToFileURL(esmPath).href);
    // ESM modules carry a 'default' key when a CJS module is re-exported;
    // strip it so we compare the named-export surface.
    const esmKeys = new Set(Object.keys(esm).filter((k) => k !== "default"));
    const cjsKeys = new Set(Object.keys(cjs).filter((k) => k !== "default"));
    expect(esmKeys).toEqual(cjsKeys);
  });
});

describe("IIFE bundle smoke test", () => {
  // Evaluate the IIFE in a fresh function scope so `var AccessLint` stays
  // local — mirrors what happens when the script is dropped in a browser
  // without interfering with other tests' globals.
  const code = readFileSync(iifePath, "utf8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-new-func
  const iife: any = new Function(`${code}\nreturn AccessLint;`)();

  it("exposes runAudit on the AccessLint global", () => {
    expect(typeof iife.runAudit).toBe("function");
  });

  it("exposes the rules array", () => {
    expect(Array.isArray(iife.rules)).toBe(true);
    expect(iife.rules.length).toBeGreaterThan(0);
  });

  it("runAudit works against a missing img alt document", () => {
    const doc = new DOMParser().parseFromString(`<img src="x.png">`, "text/html");
    const result = iife.runAudit(doc);
    expect(
      result.violations.some((v: { ruleId: string }) => v.ruleId === "text-alternatives/img-alt"),
    ).toBe(true);
  });
});
