/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AuditResult, Rule, Violation } from "@accesslint/core";

vi.mock("@accesslint/core", async () => {
  const actual = await vi.importActual<typeof import("@accesslint/core")>("@accesslint/core");
  return {
    ...actual,
    runAudit: vi.fn(),
    getRuleById: vi.fn(),
  };
});

import { runAudit, getRuleById } from "@accesslint/core";
import { toBeAccessible } from "./matchers";

const mockRunAudit = vi.mocked(runAudit);
const mockGetRuleById = vi.mocked(getRuleById);

function auditResult(violations: Violation[]): AuditResult {
  return { url: "about:blank", timestamp: 0, violations, ruleCount: 1, skippedRules: [] };
}

function violation(overrides: Partial<Violation> = {}): Violation {
  return {
    ruleId: "text-alternatives/img-alt",
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
    const result = toBeAccessible.call(context, "not an element" as unknown as Element);
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

    mockRunAudit.mockReturnValue(auditResult([violation({ element: img })]));

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

    mockRunAudit.mockReturnValue(auditResult([violation({ element: sibling })]));

    const result = toBeAccessible.call(context, container);
    expect(result.pass).toBe(true);

    container.remove();
    sibling.remove();
  });

  it("filters out disabled rules via options", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    // The matcher passes disabledRules down to runAudit, so no violations come back
    mockRunAudit.mockReturnValue(auditResult([]));

    const result = toBeAccessible.call(context, document.body, {
      disabledRules: ["text-alternatives/img-alt"],
    });
    expect(result.pass).toBe(true);
    expect(mockRunAudit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ disabledRules: ["text-alternatives/img-alt"] }),
    );

    img.remove();
  });

  it("keeps violations for rules not disabled", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    mockRunAudit.mockReturnValue(auditResult([violation({ element: img })]));

    const result = toBeAccessible.call(context, document.body, {
      disabledRules: ["distinguishable/color-contrast"],
    });
    expect(result.pass).toBe(false);

    img.remove();
  });

  it("failOn=serious ignores moderate/minor violations", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const img = document.createElement("img");
    el.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([
        violation({ impact: "moderate", element: img }),
        violation({ ruleId: "other", impact: "minor", element: img, selector: "img" }),
      ]),
    );

    const result = toBeAccessible.call(context, el, { failOn: "serious" });
    expect(result.pass).toBe(true);

    el.remove();
  });

  it("failOn=serious still fails on critical violations", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const img = document.createElement("img");
    el.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ impact: "critical", element: img })]),
    );

    const result = toBeAccessible.call(context, el, { failOn: "serious" });
    expect(result.pass).toBe(false);

    el.remove();
  });

  it("auto-enables componentMode when received is not documentElement", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    mockRunAudit.mockReturnValue(auditResult([]));
    toBeAccessible.call(context, el);

    expect(mockRunAudit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ componentMode: true }),
    );

    el.remove();
  });

  it("disables componentMode by default when asserting on documentElement", () => {
    mockRunAudit.mockReturnValue(auditResult([]));
    toBeAccessible.call(context, document.documentElement);

    expect(mockRunAudit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ componentMode: false }),
    );
  });

  it("explicit componentMode option overrides auto-detection", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    mockRunAudit.mockReturnValue(auditResult([]));

    toBeAccessible.call(context, el, { componentMode: false });

    expect(mockRunAudit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ componentMode: false }),
    );

    el.remove();
  });

  it("passes locale, includeAAA, additionalRules through to runAudit", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    mockRunAudit.mockReturnValue(auditResult([]));

    const customRule: Rule = {
      id: "custom/x",
      category: "custom",
      wcag: [],
      level: "A",
      description: "",
      run: () => [],
    };

    toBeAccessible.call(context, el, {
      locale: "es",
      includeAAA: true,
      additionalRules: [customRule],
    });

    expect(mockRunAudit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        locale: "es",
        includeAAA: true,
        additionalRules: [customRule],
      }),
    );

    el.remove();
  });

  it("failure message includes impact, WCAG, level, context, fix, guidance", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const img = document.createElement("img");
    el.appendChild(img);

    mockRunAudit.mockReturnValue(
      auditResult([
        violation({
          element: img,
          context: "inside a <main> landmark",
          fix: { type: "add-attribute", attribute: "alt", value: "" },
        }),
      ]),
    );
    mockGetRuleById.mockReturnValue({
      id: "text-alternatives/img-alt",
      category: "text-alternatives",
      wcag: ["1.1.1"],
      level: "A",
      description: "Images must have alt text",
      guidance: "Decorative images should have alt=\"\"",
      run: () => [],
    });

    const result = toBeAccessible.call(context, el);
    expect(result.pass).toBe(false);
    const msg = result.message();
    expect(msg).toContain("[critical]");
    expect(msg).toContain("WCAG 1.1.1");
    expect(msg).toContain("A");
    expect(msg).toContain("context: inside a <main>");
    expect(msg).toContain("fix: add-attribute alt");
    expect(msg).toContain("guidance: Decorative");

    el.remove();
  });

  it("handles invalid selectors gracefully", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    mockRunAudit.mockReturnValue(
      auditResult([violation({ selector: "[invalid>>>", element: undefined })]),
    );

    const result = toBeAccessible.call(context, el);
    expect(result.pass).toBe(true);

    el.remove();
  });

  it("scopes shadow DOM violations via shadow-host ancestry", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const img = document.createElement("img");
    shadow.appendChild(img);

    mockRunAudit.mockReturnValue(auditResult([violation({ element: img })]));

    const result = toBeAccessible.call(context, host);
    expect(result.pass).toBe(false);

    host.remove();
  });

  describe("snapshots", () => {
    let snapshotDir: string;

    beforeEach(() => {
      snapshotDir = join(
        tmpdir(),
        `accesslint-vitest-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      mkdirSync(snapshotDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(snapshotDir, { recursive: true, force: true });
    });

    it("creates a baseline on first run and passes", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const img = document.createElement("img");
      el.appendChild(img);

      mockRunAudit.mockReturnValue(auditResult([violation({ element: img })]));

      const result = toBeAccessible.call(context, el, {
        snapshot: "first",
        snapshotDir,
      });
      expect(result.pass).toBe(true);
      expect(result.message()).toMatch(/created with 1 baseline/);

      const saved = JSON.parse(readFileSync(join(snapshotDir, "first.json"), "utf-8"));
      expect(saved).toHaveLength(1);
      expect(saved[0].ruleId).toBe("text-alternatives/img-alt");

      el.remove();
    });

    it("fails when a new violation appears beyond the baseline", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");
      el.appendChild(img1);
      el.appendChild(img2);

      // First run: create baseline with one violation
      mockRunAudit.mockReturnValueOnce(auditResult([violation({ element: img1 })]));
      toBeAccessible.call(context, el, { snapshot: "new", snapshotDir });

      // Second run: an additional violation appears
      mockRunAudit.mockReturnValueOnce(
        auditResult([
          violation({ element: img1 }),
          violation({ element: img2 }),
        ]),
      );
      const result = toBeAccessible.call(context, el, { snapshot: "new", snapshotDir });
      expect(result.pass).toBe(false);
      expect(result.message()).toMatch(/found 1 new/);

      el.remove();
    });

    it("ratchets down when violations decrease", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const img1 = document.createElement("img");
      const img2 = document.createElement("img");
      el.appendChild(img1);
      el.appendChild(img2);

      // Baseline: two violations
      mockRunAudit.mockReturnValueOnce(
        auditResult([violation({ element: img1 }), violation({ element: img2 })]),
      );
      toBeAccessible.call(context, el, { snapshot: "ratchet", snapshotDir });

      // One fixed
      mockRunAudit.mockReturnValueOnce(auditResult([violation({ element: img1 })]));
      const result = toBeAccessible.call(context, el, { snapshot: "ratchet", snapshotDir });
      expect(result.pass).toBe(true);
      expect(result.message()).toMatch(/ratcheted/);

      const saved = JSON.parse(readFileSync(join(snapshotDir, "ratchet.json"), "utf-8"));
      expect(saved).toHaveLength(1);

      el.remove();
    });

    it("ACCESSLINT_UPDATE=1 forces baseline refresh", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      const img = document.createElement("img");
      el.appendChild(img);

      mockRunAudit.mockReturnValueOnce(auditResult([]));
      toBeAccessible.call(context, el, { snapshot: "force", snapshotDir });

      const prev = process.env.ACCESSLINT_UPDATE;
      process.env.ACCESSLINT_UPDATE = "1";
      try {
        mockRunAudit.mockReturnValueOnce(auditResult([violation({ element: img })]));
        const result = toBeAccessible.call(context, el, { snapshot: "force", snapshotDir });
        expect(result.pass).toBe(true);

        const saved = JSON.parse(readFileSync(join(snapshotDir, "force.json"), "utf-8"));
        expect(saved).toHaveLength(1);
      } finally {
        if (prev === undefined) delete process.env.ACCESSLINT_UPDATE;
        else process.env.ACCESSLINT_UPDATE = prev;
      }

      el.remove();
    });

    it("rejects invalid snapshot names", () => {
      const el = document.createElement("div");
      document.body.appendChild(el);
      mockRunAudit.mockReturnValue(auditResult([]));

      expect(() =>
        toBeAccessible.call(context, el, { snapshot: "../escape", snapshotDir }),
      ).toThrow(/invalid characters/i);

      el.remove();
    });
  });
});
