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

// audit_html now audits via Chrome (cli-runner.scanHtml → `accesslint scan --stdin`); its
// arg-building is covered in cli-runner.test.ts and the live path by the CLI's own smoke.

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
