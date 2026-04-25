import { describe, it, expect, vi, beforeEach } from "vitest";

const cliAuditMock = vi.fn();

vi.mock("@accesslint/cli", () => ({
  audit: cliAuditMock,
}));

const { audit, clearStoredAudits, getStoredAudit } = await import("../src/lib/state.js");

beforeEach(() => {
  cliAuditMock.mockReset();
  cliAuditMock.mockReturnValue({
    url: "",
    timestamp: 0,
    violations: [],
    ruleCount: 0,
    skippedRules: [],
  });
  clearStoredAudits();
});

describe("state.audit shim", () => {
  it("forwards includeAAA / componentMode / disabledRules to cliAudit", () => {
    audit("<p>x</p>", {
      includeAAA: true,
      componentMode: true,
      disabledRules: ["text-alternatives/img-alt"],
    });
    expect(cliAuditMock).toHaveBeenCalledWith("<p>x</p>", {
      includeAAA: true,
      componentMode: true,
      disabledRules: ["text-alternatives/img-alt"],
    });
  });

  it("does not forward `name` to cliAudit (used only for storage)", () => {
    audit("<p>x</p>", { name: "before", includeAAA: true });
    const [, options] = cliAuditMock.mock.calls[0];
    expect(options).not.toHaveProperty("name");
    expect(options).toEqual({ includeAAA: true });
  });

  it("calls cliAudit with empty options when nothing is passed", () => {
    audit("<p>x</p>");
    expect(cliAuditMock).toHaveBeenCalledWith("<p>x</p>", {});
  });

  it("stores the result under name when provided", () => {
    cliAuditMock.mockReturnValue({
      url: "",
      timestamp: 1,
      violations: [],
      ruleCount: 1,
      skippedRules: [],
    });
    audit("<p>x</p>", { name: "snapshot" });
    expect(getStoredAudit("snapshot")).toBeDefined();
    expect(getStoredAudit("snapshot")?.timestamp).toBe(1);
  });

  it("does not store when no name provided", () => {
    audit("<p>x</p>", { includeAAA: true });
    expect(getStoredAudit("anything")).toBeUndefined();
  });
});
