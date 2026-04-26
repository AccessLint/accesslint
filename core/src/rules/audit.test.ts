import { describe, it, expect } from "vitest";
import { makeDoc } from "../test-helpers";
import { runAudit, diffAudit, getActiveRules, createChunkedAudit } from "./index";
import { generateDoc, SMALL_SIZE } from "../bench/fixtures";

describe("runAudit integration", () => {
  it("returns violations on a realistic document", () => {
    const doc = generateDoc(SMALL_SIZE);
    const result = runAudit(doc);

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.ruleCount).toBeGreaterThan(20);
    expect(result.timestamp).toBeGreaterThan(0);

    // Every violation should have required fields
    for (const v of result.violations) {
      expect(v.ruleId).toBeTruthy();
      expect(v.selector).toBeTruthy();
      expect(v.message).toBeTruthy();
      expect(["critical", "serious", "moderate", "minor"]).toContain(v.impact);
    }

    // Should find violations from multiple rule categories
    const ruleIds = new Set(result.violations.map((v) => v.ruleId));
    expect(ruleIds.has("text-alternatives/img-alt")).toBe(true);
    expect(ruleIds.has("navigable/link-name")).toBe(true);
    expect(ruleIds.has("navigable/empty-heading")).toBe(true);
  }, 30_000);

  it("returns no violations on a clean document", () => {
    const doc = makeDoc(
      '<html lang="en"><head><title>Clean</title></head><body><main><h1>Hello</h1><p>World</p></main></body></html>',
    );
    const result = runAudit(doc);
    expect(result.violations).toHaveLength(0);
  });

  it("is deterministic across runs", () => {
    const doc = generateDoc(SMALL_SIZE);
    const a = runAudit(doc);
    const b = runAudit(doc);

    expect(a.violations.length).toBe(b.violations.length);
    expect(a.violations.map((v) => v.ruleId)).toEqual(b.violations.map((v) => v.ruleId));
  }, 30_000);

  it("backfills element from selector when an imperative rule omits it", () => {
    // color-contrast is one of many imperative rules that build violation
    // objects without `element: el`. After runAudit the element should be
    // resolved from the selector so post-processors (e.g.
    // attachReactFiberSource) can read fiber data off it.
    const doc = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main>' +
        '<p style="color:#ccc;background:#fff">Low contrast</p>' +
        "</main></body></html>",
    );
    const result = runAudit(doc);
    const violation = result.violations.find((v) => v.ruleId === "distinguishable/color-contrast");
    expect(violation).toBeDefined();
    expect(violation!.element).toBeDefined();
    expect(violation!.element!.tagName).toBe("P");
  });

  it("createChunkedAudit also backfills element on getViolations()", () => {
    const doc = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main>' +
        '<p style="color:#ccc;background:#fff">Low contrast</p>' +
        "</main></body></html>",
    );
    const chunked = createChunkedAudit(doc);
    while (chunked.processChunk(50)) {
      // drain
    }
    const violations = chunked.getViolations();
    const violation = violations.find((v) => v.ruleId === "distinguishable/color-contrast");
    expect(violation).toBeDefined();
    expect(violation!.element).toBeDefined();
    expect(violation!.element!.tagName).toBe("P");
  });
});

describe("componentMode", () => {
  const PAGE_LEVEL_RULES = [
    "navigable/document-title",
    "navigable/bypass",
    "navigable/page-has-heading-one",
    "navigable/skip-link",
    "readable/html-has-lang",
    "readable/html-lang-valid",
    "readable/html-xml-lang-mismatch",
    "landmarks/landmark-main",
    "landmarks/no-duplicate-banner",
    "landmarks/no-duplicate-contentinfo",
    "landmarks/no-duplicate-main",
    "landmarks/banner-is-top-level",
    "landmarks/contentinfo-is-top-level",
    "landmarks/main-is-top-level",
    "landmarks/complementary-is-top-level",
    "landmarks/landmark-unique",
    "landmarks/region",
    "distinguishable/meta-viewport",
    "enough-time/meta-refresh",
    "enough-time/meta-refresh-no-exception",
    "adaptable/orientation-lock",
    "aria/aria-hidden-body",
  ];

  it("excludes page-level rules when componentMode is true", () => {
    const active = getActiveRules({ componentMode: true });
    const activeIds = active.map((r) => r.id);

    for (const id of PAGE_LEVEL_RULES) {
      expect(activeIds).not.toContain(id);
    }
  });

  it("still includes component-level rules", () => {
    const active = getActiveRules({ componentMode: true });
    const activeIds = active.map((r) => r.id);

    expect(activeIds).toContain("text-alternatives/img-alt");
    expect(activeIds).toContain("navigable/link-name");
    expect(activeIds).toContain("labels-and-names/form-label");
    expect(activeIds).toContain("labels-and-names/button-name");
    expect(activeIds).toContain("aria/aria-roles");
    expect(activeIds).toContain("distinguishable/color-contrast");
  });

  it("suppresses page-level violations on component fragments", () => {
    const doc = makeDoc('<div><img src="photo.jpg"><a href="/"></a></div>');
    const result = runAudit(doc, { componentMode: true });

    // Should find component-level violations
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
    expect(ruleIds).toContain("navigable/link-name");

    // Should NOT find page-level violations
    for (const id of PAGE_LEVEL_RULES) {
      expect(ruleIds).not.toContain(id);
    }
  });

  it("includes page-level rules when componentMode is false", () => {
    const active = getActiveRules({ componentMode: false });
    const activeIds = active.map((r) => r.id);

    for (const id of PAGE_LEVEL_RULES) {
      expect(activeIds).toContain(id);
    }
  });
});

describe("diffAudit", () => {
  it("detects added violations", () => {
    const before = runAudit(
      makeDoc(
        '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>',
      ),
    );
    const after = runAudit(
      makeDoc(
        '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1><img src="x.jpg"></main></body></html>',
      ),
    );

    const diff = diffAudit(before, after);
    expect(diff.added.length).toBeGreaterThan(0);
    expect(diff.added.some((v) => v.ruleId === "text-alternatives/img-alt")).toBe(true);
    expect(diff.fixed).toHaveLength(0);
  });

  it("detects fixed violations", () => {
    const before = runAudit(
      makeDoc(
        '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1><img src="x.jpg"></main></body></html>',
      ),
    );
    const after = runAudit(
      makeDoc(
        '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1><img src="x.jpg" alt="A red barn"></main></body></html>',
      ),
    );

    const diff = diffAudit(before, after);
    expect(diff.fixed.some((v) => v.ruleId === "text-alternatives/img-alt")).toBe(true);
    expect(diff.added).toHaveLength(0);
  });

  it("detects unchanged violations", () => {
    const doc1 = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1><img src="x.jpg"></main></body></html>',
    );
    const doc2 = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1><img src="x.jpg"></main></body></html>',
    );
    const before = runAudit(doc1);
    const after = runAudit(doc2);

    const diff = diffAudit(before, after);
    expect(diff.unchanged.length).toBe(before.violations.length);
    expect(diff.added).toHaveLength(0);
    expect(diff.fixed).toHaveLength(0);
  });

  it("handles empty results", () => {
    const empty = { url: "", timestamp: 0, violations: [], ruleCount: 0, skippedRules: [] };
    const diff = diffAudit(empty, empty);
    expect(diff.added).toHaveLength(0);
    expect(diff.fixed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(0);
  });

  it("correctly classifies a mix of added, fixed, and unchanged", () => {
    const before = runAudit(makeDoc('<div><img src="a.jpg"><button>OK</button></div>'), {
      componentMode: true,
    });
    // Fix the img, break the button
    const after = runAudit(makeDoc('<div><img src="a.jpg" alt="photo"><button></button></div>'), {
      componentMode: true,
    });

    const diff = diffAudit(before, after);
    expect(diff.fixed.some((v) => v.ruleId === "text-alternatives/img-alt")).toBe(true);
    expect(diff.added.some((v) => v.ruleId === "labels-and-names/button-name")).toBe(true);
  });
});

describe("skippedRules", () => {
  it("collects rules that throw into skippedRules", () => {
    const throwingRule = {
      id: "test/throws",
      category: "test",
      wcag: [],
      level: "A" as const,
      description: "A rule that always throws",
      run() {
        throw new Error("boom");
      },
    };

    const doc = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>',
    );
    const result = runAudit(doc, { additionalRules: [throwingRule] });

    expect(result.skippedRules).toEqual([{ ruleId: "test/throws", error: "boom" }]);
  });

  it("returns empty skippedRules when no rules throw", () => {
    const doc = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>',
    );
    const result = runAudit(doc);

    expect(result.skippedRules).toEqual([]);
  });

  it("collects skipped rules in createChunkedAudit", () => {
    const throwingRule = {
      id: "test/chunked-throws",
      category: "test",
      wcag: [],
      level: "A" as const,
      description: "A rule that always throws",
      run() {
        throw new Error("chunked boom");
      },
    };

    const doc = makeDoc(
      '<html lang="en"><head><title>T</title></head><body><main><h1>Hi</h1></main></body></html>',
    );
    const audit = createChunkedAudit(doc, { additionalRules: [throwingRule] });

    // Process all rules in one chunk
    while (audit.processChunk(10_000)) {}

    expect(audit.getSkippedRules()).toEqual([
      { ruleId: "test/chunked-throws", error: "chunked boom" },
    ]);
  });
});
