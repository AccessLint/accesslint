import { describe, it, expect } from "vitest";

describe("input size caps", () => {
  it("audit_html rejects oversized input", async () => {
    const { registerAuditHtml } = await import("../src/tools/audit-html.js");
    const handlers: Record<
      string,
      (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>
    > = {};
    const fakeServer = {
      tool: (
        name: string,
        _d: string,
        _s: unknown,
        h: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>,
      ) => {
        handlers[name] = h;
      },
    };
    // @ts-expect-error — minimal stub of McpServer
    registerAuditHtml(fakeServer);

    const huge = "x".repeat(11 * 1024 * 1024);
    const res = await handlers.audit_html({ html: huge });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exceeds/);
  });

  it("diff_html rejects oversized input", async () => {
    const { registerDiffHtml } = await import("../src/tools/diff-html.js");
    const handlers: Record<
      string,
      (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>
    > = {};
    const fakeServer = {
      tool: (
        name: string,
        _d: string,
        _s: unknown,
        h: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>,
      ) => {
        handlers[name] = h;
      },
    };
    // @ts-expect-error — minimal stub of McpServer
    registerDiffHtml(fakeServer);

    const huge = "x".repeat(11 * 1024 * 1024);
    const res = await handlers.diff_html({ html: huge, before: "anything" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exceeds/);
  });
});
