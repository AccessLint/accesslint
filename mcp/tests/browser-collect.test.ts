import { describe, it, expect, beforeEach } from "vitest";
import { collectAuditResult } from "../src/tools/audit-browser-collect.js";
import {
  audit,
  clearStoredAudits,
  getStoredAudit,
  registerExpectedToken,
} from "../src/lib/state.js";
import { diffAudit } from "@accesslint/core";
import { formatDiff } from "../src/lib/format.js";

function fakeRaw(opts: {
  sessionToken?: string;
  violations?: unknown[];
  error?: string;
  url?: string;
}): string {
  return JSON.stringify({
    sessionToken: opts.sessionToken,
    url: opts.url ?? "https://example.com/",
    timestamp: 1700000000000,
    ruleCount: 50,
    skippedRules: [],
    violations: opts.violations ?? [],
    error: opts.error,
  });
}

describe("collectAuditResult", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("parses, stores, and formats a successful in-page result", () => {
    const raw = fakeRaw({
      sessionToken: "tok",
      violations: [
        {
          ruleId: "text-alternatives/img-alt",
          selector: "img.hero",
          html: '<img class="hero" src="hero.jpg">',
          impact: "critical",
          message: "Image is missing an alt attribute",
        },
      ],
    });
    registerExpectedToken("homepage", "tok");
    const outcome = collectAuditResult({ raw_result: raw, name: "homepage" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.text).toContain("text-alternatives/img-alt");
    expect(outcome.text).toContain("img.hero");

    const stored = getStoredAudit("homepage");
    expect(stored).toBeDefined();
    expect(stored!.violations).toHaveLength(1);
    expect(stored!.url).toBe("https://example.com/");
  });

  it("works without a name (no token check, no storage)", () => {
    const raw = fakeRaw({ violations: [] });
    const outcome = collectAuditResult({ raw_result: raw });
    expect(outcome.ok).toBe(true);
  });

  it("rejects a token mismatch when a name was registered", () => {
    registerExpectedToken("page", "expected-tok");
    const raw = fakeRaw({ sessionToken: "different-tok", violations: [] });
    const outcome = collectAuditResult({ raw_result: raw, name: "page" });
    expect(outcome.ok).toBe(false);
    expect(outcome.text).toMatch(/token mismatch/i);
    expect(getStoredAudit("page")).toBeUndefined();
  });

  it("surfaces the in-page error field with actionable hints", () => {
    const raw = fakeRaw({ sessionToken: "tok", error: "AccessLint is undefined" });
    const outcome = collectAuditResult({ raw_result: raw });
    expect(outcome.ok).toBe(false);
    expect(outcome.text).toContain("AccessLint is undefined");
    expect(outcome.text).toMatch(/inject=true/);
  });

  it("returns a clear parse error for malformed JSON", () => {
    const outcome = collectAuditResult({ raw_result: "not json {{" });
    expect(outcome.ok).toBe(false);
    expect(outcome.text).toMatch(/JSON\.parse/);
  });

  it("rejects a result whose violations field is missing", () => {
    const outcome = collectAuditResult({
      raw_result: JSON.stringify({ sessionToken: "tok", url: "https://example.com/" }),
    });
    expect(outcome.ok).toBe(false);
    expect(outcome.text).toMatch(/violations/);
  });

  it("filters formatted output by min_impact", () => {
    const raw = fakeRaw({
      violations: [
        {
          ruleId: "text-alternatives/img-alt",
          selector: "img",
          html: "<img>",
          impact: "critical",
          message: "missing alt",
        },
        {
          ruleId: "some/minor-rule",
          selector: "p",
          html: "<p>x</p>",
          impact: "minor",
          message: "minor thing",
        },
      ],
    });
    const outcome = collectAuditResult({ raw_result: raw, min_impact: "serious" });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.text).toContain("text-alternatives/img-alt");
    expect(outcome.text).not.toContain("some/minor-rule");
  });

  it("interoperates with diff_html via the shared audit store", () => {
    const browserBefore = fakeRaw({
      violations: [
        {
          ruleId: "text-alternatives/img-alt",
          selector: "img",
          html: "<img>",
          impact: "critical",
          message: "missing alt",
        },
      ],
    });
    const collected = collectAuditResult({ raw_result: browserBefore, name: "before" });
    expect(collected.ok).toBe(true);

    const before = getStoredAudit("before")!;
    const after = audit('<img alt="ok">');
    const diff = diffAudit(before, after);

    expect(diff.fixed.length).toBeGreaterThan(0);
    expect(formatDiff(diff)).toContain("fixed");
  });
});
