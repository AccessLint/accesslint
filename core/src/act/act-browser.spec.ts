import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FixtureEntry } from "./earl-report";
import { iifeExists, runRuleByActId, type RuleActResult } from "../integration/browser-helpers";

const FIXTURE_PATH = resolve(import.meta.dirname, "../../act-fixtures/act-testcases.json");

const fixturesExist = existsSync(FIXTURE_PATH);

function loadFixtures(): FixtureEntry[] {
  if (!fixturesExist) return [];
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
}

test.skip(!fixturesExist, "ACT fixtures not downloaded");
test.skip(!iifeExists, "IIFE bundle not built (run npm run build)");

const fixtures = loadFixtures();

// Deduplicate by (testcaseId, coreRuleId). A single testcase may appear
// multiple times (one ACT rule → multiple core rules, or multiple ACT
// rules → same core rule); we want exactly one test per (testcase, core rule).
const seen = new Set<string>();
const deduped = fixtures.filter((f) => {
  const key = `${f.testcaseId}|${f.coreRuleId}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Group by the fixture's coreRuleId
const byRule = new Map<string, FixtureEntry[]>();
for (const entry of deduped) {
  const list = byRule.get(entry.coreRuleId) ?? [];
  list.push(entry);
  byRule.set(entry.coreRuleId, list);
}

// Test fixtures that reference external or root-relative stylesheets that
// can't be loaded in the test environment (page.setContent doesn't resolve
// external URLs or root-relative paths like /path/styles.css)
function usesExternalStylesheets(html: string): boolean {
  return (
    /<link\s[^>]*href\s*=\s*["'][^"']*:\/\//i.test(html) ||
    /<link\s[^>]*href\s*=\s*["']\/[^"']/i.test(html)
  );
}

// Test fixtures that use Shadow DOM (attachShadow) — our tree walker
// doesn't descend into shadow roots, so these can't be tested statically
function usesShadowDom(html: string): boolean {
  return /attachShadow/i.test(html);
}

for (const [coreRuleId, entries] of byRule) {
  const actRuleIds = [...new Set(entries.map((e) => e.actRuleId))].join(",");
  test.describe(`${coreRuleId} (ACT ${actRuleIds})`, () => {
    for (const entry of entries) {
      const testName = `[${entry.expected}] ${entry.testcaseTitle} (${entry.testcaseId.slice(0, 8)})`;
      const annotations = [
        { type: "expected", description: entry.expected },
        { type: "actRuleId", description: entry.actRuleId },
        { type: "coreRuleId", description: coreRuleId },
        { type: "testcaseId", description: entry.testcaseId },
      ];

      // Skip tests that depend on external stylesheets or Shadow DOM
      if (usesExternalStylesheets(entry.html) || usesShadowDom(entry.html)) {
        test.skip(testName, { annotation: annotations }, async () => {});
        continue;
      }

      test(testName, { annotation: annotations }, async ({ page }) => {
        const result: RuleActResult = await runRuleByActId(page, entry.actRuleId, entry.html);
        const hasViolations = result.violations.length > 0;

        if (result.inapplicable) {
          test.info().annotations.push({ type: "inapplicable", description: "true" });
        }

        if (entry.expected === "failed") {
          expect(
            hasViolations,
            `Expected violations for "${entry.testcaseTitle}" but got none`,
          ).toBe(true);
        } else {
          expect(
            hasViolations,
            `Expected no violations for "${entry.testcaseTitle}" but got ${result.violations.length}`,
          ).toBe(false);
        }
      });
    }
  });
}
