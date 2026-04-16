/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditResult, Rule, Violation } from "@accesslint/core";

vi.mock("@accesslint/core", () => ({
  runAudit: vi.fn(),
  getRuleById: vi.fn(),
}));

import { runAudit, getRuleById } from "@accesslint/core";
import { toBeAccessible } from "./matchers";

const mockRunAudit = vi.mocked(runAudit);
const mockGetRuleById = vi.mocked(getRuleById);

function auditResult(violations: Violation[]): AuditResult {
  return { url: "about:blank", timestamp: 0, violations, ruleCount: 1 };
}

function violation(overrides: Partial<Violation> = {}): Violation {
  return {
    ruleId: "img-alt",
    selector: "img",
    html: "<img>",
    impact: "critical",
    message: "Images must have alternate text",
    ...overrides,
  };
}

describe("toBeAccessible", () => {
  const context = { isNot: false };

  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRuleById.mockReturnValue(undefined);
  });

  it("fails when received is not an Element", () => {
    const result = toBeAccessible.call(context, "not an element" as any);
    expect(result.pass).toBe(false);
    expect(result.message()).toMatch(/expects an Element/);
  });

  it("passes when there are no violations", () => {
    mockRunAudit.mockReturnValue(auditResult([]));
    const el = document.createElement("div");
    document.body.appendChild(el);

    const result = toBeAccessible.call(context, el);
    expect(result.pass).toBe(true);
    expect(result.message()).toBe(
      "Expected element to have accessibility violations, but none were found",
    );

    el.remove();
  });

  it("fails when there are violations scoped to the element", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ selector: "img" })]),
    );

    const result = toBeAccessible.call(context, document.body);
    expect(result.pass).toBe(false);
    expect(result.message()).toMatch(/found 1/);

    img.remove();
  });

  it("ignores violations outside the scoped element", () => {
    const container = document.createElement("div");
    const sibling = document.createElement("img");
    document.body.appendChild(container);
    document.body.appendChild(sibling);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ selector: "img" })]),
    );

    const result = toBeAccessible.call(context, container);
    expect(result.pass).toBe(true);

    container.remove();
    sibling.remove();
  });

  it("filters out disabled rules", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ ruleId: "img-alt", selector: "img" })]),
    );

    const result = toBeAccessible.call(context, document.body, {
      disabledRules: ["img-alt"],
    });
    expect(result.pass).toBe(true);

    img.remove();
  });

  it("keeps violations for rules not in the disabled list", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ ruleId: "img-alt", selector: "img" })]),
    );

    const result = toBeAccessible.call(context, document.body, {
      disabledRules: ["color-contrast"],
    });
    expect(result.pass).toBe(false);

    img.remove();
  });

  it("includes WCAG and level info in failure message", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ selector: "img" })]),
    );
    mockGetRuleById.mockReturnValue({
      id: "img-alt",
      wcag: ["1.1.1"],
      level: "A",
      description: "Images must have alt text",
      run: () => [],
    });

    const result = toBeAccessible.call(context, document.body);
    expect(result.pass).toBe(false);
    const msg = result.message();
    expect(msg).toContain("1.1.1");
    expect(msg).toContain("[A]");
    expect(msg).toContain("img-alt");

    img.remove();
  });

  it("calls runAudit with the element's ownerDocument", () => {
    mockRunAudit.mockReturnValue(auditResult([]));
    const el = document.createElement("div");
    document.body.appendChild(el);

    toBeAccessible.call(context, el);
    expect(mockRunAudit).toHaveBeenCalledWith(document);

    el.remove();
  });

  it("handles invalid selectors in violations gracefully", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ selector: "[invalid>>>" })]),
    );

    const result = toBeAccessible.call(context, el);
    // Invalid selector should be caught and filtered out
    expect(result.pass).toBe(true);

    el.remove();
  });
});
