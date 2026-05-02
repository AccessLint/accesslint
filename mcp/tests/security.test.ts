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

  it("audit_diff rejects oversized html input", async () => {
    const { registerAuditDiff } = await import("../src/tools/audit-diff.js");
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
    registerAuditDiff(fakeServer);

    const huge = "x".repeat(11 * 1024 * 1024);
    const res = await handlers.audit_diff({ html: huge });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exceeds/);
  });
});
