import { describe, it, expect } from "vitest";

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
