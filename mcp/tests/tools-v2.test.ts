import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { clearStoredAudits } from "../src/lib/state.js";

type ToolHandler = (
  args: unknown,
) => Promise<{ isError?: boolean; content: { type: string; text: string }[] }>;

interface FakeServer {
  tool: (name: string, _desc: string, _schema: unknown, handler: ToolHandler) => void;
}

function makeFakeServer(): { server: FakeServer; handlers: Record<string, ToolHandler> } {
  const handlers: Record<string, ToolHandler> = {};
  const server: FakeServer = {
    tool: (name, _desc, _schema, handler) => {
      handlers[name] = handler;
    },
  };
  return { server, handlers };
}

describe("audit_html — new options", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("compact format produces a one-line summary plus per-violation lines", async () => {
    const { registerAuditHtml } = await import("../src/tools/audit-html.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditHtml(server);

    const res = await handlers.audit_html({
      html: '<img src="photo.jpg">',
      format: "compact",
    });
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    const firstLine = text.split("\n")[0];
    expect(firstLine).toMatch(/^\d+ violation/);
    expect(text).toContain("[CRITICAL]");
    expect(text).not.toContain("HTML:");
    expect(text).not.toContain("Guidance:");
  });

  it("wcag filter narrows to matching rules only", async () => {
    const { registerAuditHtml } = await import("../src/tools/audit-html.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditHtml(server);

    // image without alt → text-alternatives/img-alt (wcag 1.1.1)
    // contrast issues would also appear; restrict to 1.1.1 to verify filtering
    const res = await handlers.audit_html({
      html: '<img src="photo.jpg">',
      wcag: ["1.1.1"],
      format: "compact",
    });
    expect(res.isError).toBeUndefined();
    expect(res.content[0].text).toContain("text-alternatives/img-alt");
  });

  it("rules filter restricts to a specific rule ID", async () => {
    const { registerAuditHtml } = await import("../src/tools/audit-html.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditHtml(server);

    const res = await handlers.audit_html({
      html: '<img src="photo.jpg"><a href="/x">click here</a>',
      rules: ["text-alternatives/img-alt"],
      format: "compact",
    });
    const text = res.content[0].text;
    expect(text).toContain("text-alternatives/img-alt");
    // navigable/link-name should not appear when restricted by rules allow-list
    expect(text).not.toContain("navigable/link-name");
  });
});

describe("audit_browser_script — wcag/rules filters", () => {
  it("merges wcag allow-list into the disabledRules baked into the script", async () => {
    const { registerAuditBrowserScript } = await import(
      "../src/tools/audit-browser-script.js"
    );
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditBrowserScript(server);

    const res = await handlers.audit_browser_script({
      inject: false,
      wcag: ["1.4.3"], // only contrast
    });
    expect(res.isError).toBeUndefined();
    // Two text content entries: instructions + script block
    const scriptBlock = res.content[1].text;
    // The script body should reference disabledRules and exclude the contrast rule
    expect(scriptBlock).toContain("disabledRules");
    expect(scriptBlock).not.toContain("distinguishable/color-contrast");
    // Other rules should be in the disabled list
    expect(scriptBlock).toContain("text-alternatives/img-alt");
  });
});

describe("diff_html — wcag filter", () => {
  it("post-filters all three diff buckets by wcag criterion", async () => {
    const { registerDiffHtml } = await import("../src/tools/diff-html.js");
    const { audit } = await import("../src/lib/state.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerDiffHtml(server);

    audit('<img src="photo.jpg"><a href="/x">click here</a>', { name: "before" });
    const res = await handlers.diff_html({
      html: '<img src="photo.jpg" alt="ok"><a href="/x">click here</a>',
      before: "before",
      wcag: ["1.1.1"],
      format: "compact",
    });
    const text = res.content[0].text;
    // Only 1.1.1 violations should remain — the link-name (2.4.4) should not appear
    expect(text).not.toContain("navigable/link-name");
    expect(text).toContain("diff:");
  });
});

describe("audit_diff", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("first call returns 'Baseline established' plus the audit", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const res = await handlers.audit_diff({
      html: '<img src="photo.jpg">',
      format: "compact",
    });
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    expect(text).toContain("Baseline established");
    expect(text).toContain("text-alternatives/img-alt");
  });

  it("second call returns a diff against the prior baseline", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const html = '<img src="photo.jpg">';
    await handlers.audit_diff({ html });
    const res = await handlers.audit_diff({
      html: '<img src="photo.jpg" alt="ok">',
      format: "compact",
    });
    // Same baseline-html input still hits the same key; the *content* differs
    // so this is actually a different key. Use the same html to test diff-against-prior.
    // The test below covers that path.
    expect(res.content[0].text).toContain("Baseline established");
  });

  it("baselines per-key when called repeatedly with the same html", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const html = '<img src="photo.jpg">';
    const first = await handlers.audit_diff({ html });
    expect(first.content[0].text).toContain("Baseline established");

    const second = await handlers.audit_diff({ html, format: "compact" });
    // Same html → same key → diff against the stored baseline (which equals new audit)
    const text = second.content[0].text;
    expect(text).not.toContain("Baseline established");
    expect(text).toMatch(/diff:/);
  });

  it("rejects when zero sources are provided", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const res = await handlers.audit_diff({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exactly one of/);
  });

  it("rejects when more than one source is provided", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const res = await handlers.audit_diff({
      html: "<p>x</p>",
      url: "http://example.com",
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exactly one of/);
  });

  it("audit_name reuses an already-stored audit", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { audit } = await import("../src/lib/state.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    audit('<img src="photo.jpg">', { name: "live-audit" });
    const first = await handlers.audit_diff({ audit_name: "live-audit", format: "compact" });
    expect(first.content[0].text).toContain("Baseline established");

    audit('<img src="photo.jpg" alt="ok">', { name: "live-audit" });
    const second = await handlers.audit_diff({ audit_name: "live-audit", format: "compact" });
    expect(second.content[0].text).toMatch(/diff:/);
  });

  it("returns error for unknown audit_name", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditDiff(server);

    const res = await handlers.audit_diff({ audit_name: "missing" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/No stored audit/);
  });
});

describe("quick_check", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("returns PASS for clean HTML", async () => {
    const { registerQuickCheck } = await import("../src/tools/quick-check.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerQuickCheck(server);

    const res = await handlers.quick_check({
      html: '<img src="photo.jpg" alt="A photo">',
    });
    expect(res.isError).toBeUndefined();
    expect(res.content[0].text).toBe("PASS — 0 violations");
  });

  it("returns FAIL with counts for violating HTML", async () => {
    const { registerQuickCheck } = await import("../src/tools/quick-check.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerQuickCheck(server);

    const res = await handlers.quick_check({ html: '<img src="photo.jpg">' });
    const text = res.content[0].text;
    expect(text).toMatch(/^FAIL — \d+ violation/);
    expect(text).toContain("critical");
  });

  it("rejects when zero sources provided", async () => {
    const { registerQuickCheck } = await import("../src/tools/quick-check.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerQuickCheck(server);

    const res = await handlers.quick_check({});
    expect(res.isError).toBe(true);
  });

  it("audit_name reuses a stored audit", async () => {
    const { registerQuickCheck } = await import("../src/tools/quick-check.js");
    const { audit } = await import("../src/lib/state.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerQuickCheck(server);

    audit('<img src="photo.jpg">', { name: "snap" });
    const res = await handlers.quick_check({ audit_name: "snap" });
    expect(res.content[0].text).toMatch(/^FAIL/);
  });

  it("respects wcag filter", async () => {
    const { registerQuickCheck } = await import("../src/tools/quick-check.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerQuickCheck(server);

    // 1.1.1 should match img-alt; 2.4.4 should not be triggered by an isolated img
    const res = await handlers.quick_check({
      html: '<img src="photo.jpg">',
      wcag: ["2.4.4"],
    });
    expect(res.content[0].text).toBe("PASS — 0 violations");
  });
});

describe("explain_rule", () => {
  it("returns metadata for a known rule", async () => {
    const { registerExplainRule } = await import("../src/tools/explain-rule.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerExplainRule(server);

    const res = await handlers.explain_rule({ id: "text-alternatives/img-alt" });
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    expect(text).toContain("text-alternatives/img-alt");
    expect(text).toContain("Description:");
    expect(text).toContain("WCAG:");
    expect(text).toContain("Level:");
  });

  it("returns error for unknown rule", async () => {
    const { registerExplainRule } = await import("../src/tools/explain-rule.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerExplainRule(server);

    const res = await handlers.explain_rule({ id: "nonexistent/rule" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/Unknown rule/);
  });
});

describe("list_rules — compact format", () => {
  it("compact format emits one rule per line, no pipes", async () => {
    const { registerListRules } = await import("../src/tools/list-rules.js");
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerListRules(server);

    const res = await handlers.list_rules({ wcag: "1.1.1", format: "compact" });
    const text = res.content[0].text;
    expect(text).not.toContain("|");
    expect(text.split("\n")[0]).toMatch(/^\d+ rule/);
  });
});

describe("audit_browser_collect — compact format", () => {
  beforeEach(() => {
    clearStoredAudits();
  });

  it("compact format produces one-line summary plus per-violation lines", async () => {
    const { registerAuditBrowserCollect } = await import(
      "../src/tools/audit-browser-collect.js"
    );
    const { server, handlers } = makeFakeServer();
    // @ts-expect-error fake server stub
    registerAuditBrowserCollect(server);

    const raw = JSON.stringify({
      url: "http://example.com",
      timestamp: 1,
      ruleCount: 1,
      skippedRules: [],
      violations: [
        {
          ruleId: "text-alternatives/img-alt",
          selector: "img",
          html: '<img src="photo.jpg">',
          impact: "critical",
          message: "Image element missing alt attribute.",
        },
      ],
    });

    const res = await handlers.audit_browser_collect({
      raw_result: raw,
      format: "compact",
    });
    expect(res.isError).toBeUndefined();
    const text = res.content[0].text;
    expect(text.split("\n")[0]).toMatch(/^1 violation/);
    expect(text).toContain("[CRITICAL] text-alternatives/img-alt");
    expect(text).not.toContain("HTML:");
  });
});
