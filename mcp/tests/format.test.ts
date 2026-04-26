import { describe, it, expect, vi } from "vitest";
import type { Violation, DiffResult, Rule } from "@accesslint/core";

vi.mock("@accesslint/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@accesslint/core")>();
  return {
    ...original,
    getRuleById: (id: string) => {
      const rule = original.getRuleById(id);
      return rule
        ? {
            ...rule,
            browserHint: "Screenshot the image to describe its visual content for alt text",
          }
        : rule;
    },
  };
});

const { formatViolations, formatDiff, formatRuleTable, filterByImpact, IMPACT_ORDER } =
  await import("../src/lib/format.js");

function makeViolation(overrides: Partial<Violation> = {}): Violation {
  return {
    ruleId: "text-alternatives/img-alt",
    selector: "img",
    html: '<img src="photo.jpg">',
    impact: "critical",
    message: "Image element missing alt attribute.",
    ...overrides,
  };
}

describe("formatViolations", () => {
  it("returns clean message for no violations", () => {
    expect(formatViolations([])).toBe("No accessibility violations found.");
  });

  it("formats a single violation", () => {
    const output = formatViolations([makeViolation()]);
    expect(output).toContain("Found 1 accessibility violation:");
    expect(output).toContain("[CRITICAL] text-alternatives/img-alt");
    expect(output).toContain("Image element missing alt attribute.");
    expect(output).toContain("Element: img");
    expect(output).toContain('HTML: <img src="photo.jpg">');
  });

  it("renders Source: line when violation carries source locations", () => {
    const output = formatViolations([
      makeViolation({
        source: [
          {
            file: "/src/Card.tsx",
            line: 42,
            column: 7,
            symbol: "Card",
            strategy: "react-fiber",
            confidence: "high",
          },
        ],
      }),
    ]);
    expect(output).toContain("Source: /src/Card.tsx:42:7 (Card)");
  });

  it("joins multiple source locations with owner-chain separator", () => {
    const output = formatViolations([
      makeViolation({
        source: [
          { file: "/src/Self.tsx", line: 1, strategy: "react-fiber", confidence: "high" },
          { file: "/src/Owner.tsx", line: 5, strategy: "react-owner", confidence: "medium" },
        ],
      }),
    ]);
    expect(output).toContain("Source: /src/Self.tsx:1 ← /src/Owner.tsx:5");
  });

  it("compact format appends @file:line", () => {
    const output = formatViolations(
      [
        makeViolation({
          source: [
            { file: "/src/X.tsx", line: 3, column: 1, strategy: "react-fiber", confidence: "high" },
          ],
        }),
      ],
      { format: "compact" },
    );
    expect(output).toContain("@/src/X.tsx:3:1");
  });

  it("omits Source: line when no source provided", () => {
    const output = formatViolations([makeViolation()]);
    expect(output).not.toContain("Source:");
  });

  it("sorts violations by impact severity", () => {
    const violations = [
      makeViolation({ impact: "minor", ruleId: "minor-rule" }),
      makeViolation({ impact: "critical", ruleId: "critical-rule" }),
      makeViolation({ impact: "moderate", ruleId: "moderate-rule" }),
    ];
    const output = formatViolations(violations);
    const criticalIdx = output.indexOf("critical-rule");
    const moderateIdx = output.indexOf("moderate-rule");
    const minorIdx = output.indexOf("minor-rule");
    expect(criticalIdx).toBeLessThan(moderateIdx);
    expect(moderateIdx).toBeLessThan(minorIdx);
  });

  it("includes fix suggestion when present", () => {
    const v = makeViolation({
      fix: { type: "add-attribute", attribute: "alt", value: "" },
    });
    const output = formatViolations([v]);
    expect(output).toContain('Fix: add-attribute alt=""');
  });

  it("truncates at 50 violations", () => {
    const violations = Array.from({ length: 60 }, (_, i) =>
      makeViolation({ selector: `img:nth-child(${i})` }),
    );
    const output = formatViolations(violations);
    expect(output).toContain("Showing 50 of 60 violations");
  });

  it("groups multiple violations of the same rule", () => {
    const violations = [
      makeViolation({ selector: "img:nth-child(1)" }),
      makeViolation({ selector: "img:nth-child(2)" }),
      makeViolation({ selector: "img:nth-child(3)" }),
    ];
    const output = formatViolations(violations);

    // Group header with instance count
    expect(output).toContain("[CRITICAL] text-alternatives/img-alt (3 instances)");

    // Shared metadata appears once
    const guidanceMatches = output.match(/Guidance:/g);
    expect(guidanceMatches).toHaveLength(1);
    const browserHintMatches = output.match(/Browser hint:/g);
    expect(browserHintMatches).toHaveLength(1);

    // Per-violation data still present
    expect(output).toContain("Element: img:nth-child(1)");
    expect(output).toContain("Element: img:nth-child(2)");
    expect(output).toContain("Element: img:nth-child(3)");

    // Sub-numbered within the group
    expect(output).toContain("1. Image element missing alt attribute.");
    expect(output).toContain("2. Image element missing alt attribute.");
    expect(output).toContain("3. Image element missing alt attribute.");
  });

  it("does not show instance count for single-violation rules", () => {
    const output = formatViolations([makeViolation()]);
    expect(output).not.toContain("instances)");
    // Uses flat format with top-level numbering
    expect(output).toContain("1. [CRITICAL]");
  });

  it("groups are ordered by highest severity and numbering is continuous", () => {
    const violations = [
      makeViolation({ impact: "moderate", ruleId: "moderate-rule", selector: "div:nth-child(1)" }),
      makeViolation({ impact: "moderate", ruleId: "moderate-rule", selector: "div:nth-child(2)" }),
      makeViolation({ impact: "critical", ruleId: "critical-rule", selector: "img" }),
    ];
    const output = formatViolations(violations);

    // Critical group comes first
    const criticalIdx = output.indexOf("critical-rule");
    const moderateIdx = output.indexOf("moderate-rule");
    expect(criticalIdx).toBeLessThan(moderateIdx);

    // Single critical violation uses flat numbering
    expect(output).toContain("1. [CRITICAL] critical-rule");
    // Multi moderate group continues numbering at 2
    expect(output).toContain("2. ");
    expect(output).toContain("3. ");
  });

  it("deduplicates identical context within a group", () => {
    const violations = [
      makeViolation({ selector: "img:nth-child(1)", context: "<div>shared context</div>" }),
      makeViolation({ selector: "img:nth-child(2)", context: "<div>shared context</div>" }),
    ];
    const output = formatViolations(violations);

    // Context appears once at group level
    const contextMatches = output.match(/Context:/g);
    expect(contextMatches).toHaveLength(1);
    expect(output).toContain("Context: <div>shared context</div>");
  });

  it("prints context per-violation when they differ within a group", () => {
    const violations = [
      makeViolation({ selector: "img:nth-child(1)", context: "<div>context A</div>" }),
      makeViolation({ selector: "img:nth-child(2)", context: "<div>context B</div>" }),
    ];
    const output = formatViolations(violations);

    const contextMatches = output.match(/Context:/g);
    expect(contextMatches).toHaveLength(2);
    expect(output).toContain("Context: <div>context A</div>");
    expect(output).toContain("Context: <div>context B</div>");
  });
});

describe("formatDiff", () => {
  it("formats a diff with fixed, new, and remaining", () => {
    const diff: DiffResult = {
      fixed: [makeViolation({ ruleId: "fixed-rule" })],
      added: [makeViolation({ ruleId: "new-rule" })],
      unchanged: [makeViolation({ ruleId: "remaining-rule" })],
    };
    const output = formatDiff(diff);
    expect(output).toContain("1 fixed, 1 new, 1 remaining");
    expect(output).toContain("FIXED:");
    expect(output).toContain("fixed-rule");
    expect(output).toContain("NEW:");
    expect(output).toContain("new-rule");
    expect(output).toContain("REMAINING:");
    expect(output).toContain("remaining-rule");
  });

  it("omits empty sections", () => {
    const diff: DiffResult = {
      fixed: [makeViolation()],
      added: [],
      unchanged: [],
    };
    const output = formatDiff(diff);
    expect(output).toContain("FIXED:");
    expect(output).not.toContain("NEW:");
    expect(output).not.toContain("REMAINING:");
  });
});

describe("filterByImpact", () => {
  it("filters violations at or above the threshold", () => {
    const items = [
      makeViolation({ impact: "critical", ruleId: "r1" }),
      makeViolation({ impact: "serious", ruleId: "r2" }),
      makeViolation({ impact: "moderate", ruleId: "r3" }),
      makeViolation({ impact: "minor", ruleId: "r4" }),
    ];
    const result = filterByImpact(items, "serious");
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.ruleId)).toEqual(["r1", "r2"]);
  });

  it("returns all violations when threshold is minor", () => {
    const items = [makeViolation({ impact: "critical" }), makeViolation({ impact: "minor" })];
    expect(filterByImpact(items, "minor")).toHaveLength(2);
  });

  it("returns only critical when threshold is critical", () => {
    const items = [makeViolation({ impact: "critical" }), makeViolation({ impact: "serious" })];
    const result = filterByImpact(items, "critical");
    expect(result).toHaveLength(1);
    expect(result[0].impact).toBe("critical");
  });

  it("returns empty array when no violations meet threshold", () => {
    const items = [makeViolation({ impact: "minor" })];
    expect(filterByImpact(items, "critical")).toHaveLength(0);
  });
});

describe("formatViolations with min_impact", () => {
  it("shows filter note in header when minImpact is set", () => {
    const violations = [
      makeViolation({ impact: "critical", ruleId: "r1" }),
      makeViolation({ impact: "minor", ruleId: "r2" }),
    ];
    const output = formatViolations(violations, { minImpact: "serious" });
    expect(output).toContain("filtered to serious and above from 2 total");
    expect(output).toContain("Found 1 accessibility violation");
    expect(output).not.toContain("r2");
  });

  it("returns message when all violations are below threshold", () => {
    const violations = [makeViolation({ impact: "minor" })];
    const output = formatViolations(violations, { minImpact: "critical" });
    expect(output).toContain("No accessibility violations at critical or above");
    expect(output).toContain("1 total at lower severity");
  });
});

describe("formatDiff with min_impact", () => {
  it("filters all diff categories by impact", () => {
    const diff: DiffResult = {
      fixed: [makeViolation({ impact: "minor", ruleId: "fixed-minor" })],
      added: [makeViolation({ impact: "critical", ruleId: "added-critical" })],
      unchanged: [makeViolation({ impact: "moderate", ruleId: "remaining-moderate" })],
    };
    const output = formatDiff(diff, { minImpact: "serious" });
    expect(output).not.toContain("fixed-minor");
    expect(output).toContain("added-critical");
    expect(output).not.toContain("remaining-moderate");
  });
});

describe("formatRuleTable", () => {
  it("returns message for no matching rules", () => {
    expect(formatRuleTable([])).toBe("No rules match the specified filters.");
  });

  it("formats a rule table", () => {
    const rules = [
      {
        id: "text-alternatives/img-alt",
        description: "Images must have alt text",
        level: "A",
        fixability: "contextual",
      },
    ] as Rule[];
    const output = formatRuleTable(rules);
    expect(output).toContain("1 rule:");
    expect(output).toContain("text-alternatives/img-alt");
    expect(output).toContain("contextual");
  });
});

describe("browserHint visibility", () => {
  it("shows browserHint when present", () => {
    const output = formatViolations([makeViolation()]);
    expect(output).toContain("Browser hint: Screenshot the image");
  });

  it("shows browserHint in diff NEW section", () => {
    const diff: DiffResult = {
      fixed: [],
      added: [makeViolation()],
      unchanged: [],
    };
    const output = formatDiff(diff);
    expect(output).toContain("Browser hint: Screenshot the image");
  });
});

describe("compact format", () => {
  it("formatViolations compact emits one-line summary plus one line per violation", () => {
    const violations = [
      makeViolation({ impact: "critical", ruleId: "r1", selector: "img.hero" }),
      makeViolation({ impact: "serious", ruleId: "r2", selector: "button.primary" }),
    ];
    const output = formatViolations(violations, { format: "compact" });
    const lines = output.split("\n");
    expect(lines[0]).toBe("2 violations: 1 critical, 1 serious");
    expect(lines[1]).toContain("[CRITICAL] r1 at img.hero");
    expect(lines[2]).toContain("[SERIOUS] r2 at button.primary");
    // Compact must drop verbose fields
    expect(output).not.toContain("HTML:");
    expect(output).not.toContain("Browser hint:");
    expect(output).not.toContain("Guidance:");
  });

  it("formatViolations compact includes fix directive when present", () => {
    const violations = [
      makeViolation({
        ruleId: "r1",
        fix: { type: "add-attribute", attribute: "alt", value: "" },
      }),
    ];
    const output = formatViolations(violations, { format: "compact" });
    expect(output).toContain('[fix: add-attribute alt=""]');
  });

  it("formatViolations compact handles empty result", () => {
    expect(formatViolations([], { format: "compact" })).toBe("No accessibility violations found.");
  });

  it("formatDiff compact uses +/- prefixes and counts header", () => {
    const diff: DiffResult = {
      fixed: [makeViolation({ ruleId: "fixed-rule", selector: "input.email" })],
      added: [
        makeViolation({
          ruleId: "added-rule",
          selector: "img.hero",
          fix: { type: "add-attribute", attribute: "alt", value: "" },
        }),
      ],
      unchanged: [makeViolation({ ruleId: "still-broken" })],
    };
    const output = formatDiff(diff, { format: "compact" });
    expect(output).toContain("diff: +1 new, -1 fixed, 1 unchanged");
    expect(output).toContain("+[CRITICAL] added-rule at img.hero");
    expect(output).toContain("-[CRITICAL] fixed-rule at input.email");
  });

  it("formatRuleTable compact emits one rule per line", () => {
    const rules = [
      {
        id: "text-alternatives/img-alt",
        description: "Images must have alt text",
        level: "A",
        fixability: "contextual",
        wcag: ["1.1.1"],
      },
      {
        id: "navigable/link-name",
        description: "Links must have discernible text",
        level: "A",
        fixability: "contextual",
        wcag: ["2.4.4"],
      },
    ] as unknown as Rule[];
    const output = formatRuleTable(rules, { format: "compact" });
    const lines = output.split("\n");
    expect(lines[0]).toBe("2 rules");
    expect(lines[1]).toBe("text-alternatives/img-alt (A, contextual) — Images must have alt text");
    expect(lines[2]).toBe("navigable/link-name (A, contextual) — Links must have discernible text");
    expect(output).not.toContain("|"); // no pipe-table separators
  });
});
