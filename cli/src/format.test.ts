import { describe, it, expect } from "vitest";
import { join } from "node:path";
import type { AuditResult } from "@accesslint/core";
import { formatSARIF } from "./format.js";

// Violations carry the in-page-enriched fields (wcag/level/description); cast through
// AuditResult since the core Violation type does not declare them.
function makeResult(violations: unknown[], url = "about:blank"): AuditResult {
  return { url, timestamp: 0, ruleCount: violations.length, skippedRules: [], violations } as never;
}

function parse(sarif: string) {
  const o = JSON.parse(sarif);
  return { o, run: o.runs[0], rules: o.runs[0].tool.driver.rules, results: o.runs[0].results };
}

describe("formatSARIF", () => {
  it("emits a valid 2.1.0 envelope with the accesslint driver", () => {
    const { o, run } = parse(formatSARIF(makeResult([]), "1.2.3"));
    expect(o.version).toBe("2.1.0");
    expect(o.$schema).toContain("sarif-schema-2.1.0");
    expect(run.tool.driver.name).toBe("accesslint");
    expect(run.tool.driver.version).toBe("1.2.3");
  });

  it("emits a valid empty run when there are no violations", () => {
    const { rules, results } = parse(formatSARIF(makeResult([]), "1.0.0"));
    expect(results).toEqual([]);
    expect(rules).toEqual([]);
  });

  it("dedupes rules and keeps ruleIndex pointing at the right rule", () => {
    const { rules, results } = parse(
      formatSARIF(
        makeResult([
          { ruleId: "a/x", selector: "#one", html: "<i>", impact: "critical", message: "m1", wcag: ["1.1.1"], level: "A" },
          { ruleId: "a/x", selector: "#two", html: "<i>", impact: "critical", message: "m1", wcag: ["1.1.1"], level: "A" },
          { ruleId: "b/y", selector: "#three", html: "<i>", impact: "minor", message: "m2", wcag: ["2.4.4"], level: "A" },
        ]),
        "1.0.0",
      ),
    );
    expect(rules).toHaveLength(2);
    expect(results).toHaveLength(3);
    for (const r of results) expect(rules[r.ruleIndex].id).toBe(r.ruleId);
  });

  it("maps impact onto SARIF severity levels", () => {
    const { results } = parse(
      formatSARIF(
        makeResult([
          { ruleId: "r/critical", selector: "a", html: "<i>", impact: "critical", message: "m" },
          { ruleId: "r/serious", selector: "b", html: "<i>", impact: "serious", message: "m" },
          { ruleId: "r/moderate", selector: "c", html: "<i>", impact: "moderate", message: "m" },
          { ruleId: "r/minor", selector: "d", html: "<i>", impact: "minor", message: "m" },
        ]),
        "1.0.0",
      ),
    );
    expect(results.map((r: { level: string }) => r.level)).toEqual([
      "error",
      "error",
      "warning",
      "note",
    ]);
  });

  it("tags WCAG criteria axe-style and falls back to accessibility-only for best-practice rules", () => {
    const { rules } = parse(
      formatSARIF(
        makeResult([
          { ruleId: "wcag/rule", selector: "a", html: "<i>", impact: "serious", message: "m", wcag: ["2.4.4"], level: "AA" },
          { ruleId: "bp/rule", selector: "b", html: "<i>", impact: "moderate", message: "m" },
        ]),
        "1.0.0",
      ),
    );
    expect(rules[0].properties.tags).toEqual(["accessibility", "wcag2aa", "wcag244"]);
    expect(rules[1].properties.tags).toEqual(["accessibility"]);
    expect(rules[1].properties.wcag).toBeUndefined();
  });

  it("relativizes absolute source paths to cwd and records line/column + snippet", () => {
    const abs = join(process.cwd(), "src", "App.tsx");
    const { results } = parse(
      formatSARIF(
        makeResult([
          {
            ruleId: "r/x",
            selector: "body > img",
            html: "<img>",
            impact: "critical",
            message: "m",
            source: [{ file: abs, line: 12, column: 4, ownerDepth: 0 }],
          },
        ]),
        "1.0.0",
      ),
    );
    const loc = results[0].locations[0];
    expect(loc.physicalLocation.artifactLocation.uri).toBe(join("src", "App.tsx"));
    expect(loc.physicalLocation.region.startLine).toBe(12);
    expect(loc.physicalLocation.region.startColumn).toBe(4);
    expect(loc.physicalLocation.region.snippet.text).toBe("<img>");
    expect(loc.logicalLocations[0].fullyQualifiedName).toBe("body > img");
  });

  it("grounds source-less violations to the page URL", () => {
    const { results } = parse(
      formatSARIF(
        makeResult(
          [{ ruleId: "r/x", selector: "html", html: "<html>", impact: "serious", message: "m" }],
          "https://example.com/page",
        ),
        "1.0.0",
      ),
    );
    expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe(
      "https://example.com/page",
    );
  });
});
