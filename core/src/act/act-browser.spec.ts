import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FixtureEntry } from "./earl-report";
import { iifeExists, runRuleByActId } from "../integration/browser-helpers";

const FIXTURE_PATH = resolve(
  import.meta.dirname,
  "../../act-fixtures/act-testcases.json",
);

const fixturesExist = existsSync(FIXTURE_PATH);

function loadFixtures(): FixtureEntry[] {
  if (!fixturesExist) return [];
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
}

test.skip(!fixturesExist, "ACT fixtures not downloaded");
test.skip(!iifeExists, "IIFE bundle not built (run npm run build)");

const fixtures = loadFixtures();

// Deduplicate by testcaseId (multiple ACT rules can map to the same core rule)
const seen = new Set<string>();
const deduped = fixtures.filter((f) => {
  if (seen.has(f.testcaseId)) return false;
  seen.add(f.testcaseId);
  return true;
});

// Group by the fixture's coreRuleId
const byRule = new Map<string, FixtureEntry[]>();
for (const entry of deduped) {
  const list = byRule.get(entry.coreRuleId) ?? [];
  list.push(entry);
  byRule.set(entry.coreRuleId, list);
}

// Rules whose test fixtures may trigger browser navigation (meta refresh with delay=0)
const NAVIGATION_RULES = new Set(["enough-time/meta-refresh", "enough-time/meta-refresh-no-exception"]);

// Test fixtures that reference external or root-relative stylesheets that
// can't be loaded in the test environment (page.setContent doesn't resolve
// external URLs or root-relative paths like /path/styles.css)
function usesExternalStylesheets(html: string): boolean {
  return /<link\s[^>]*href\s*=\s*["'][^"']*:\/\//i.test(html) ||
    /<link\s[^>]*href\s*=\s*["']\/[^"']/i.test(html);
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
      // Encode metadata in test title for the EARL reporter
      const testName = `[${entry.expected}] ${entry.testcaseTitle} (${entry.testcaseId.slice(0, 8)}) |act:${entry.actRuleId}|core:${coreRuleId}|tc:${entry.testcaseId}`;

      // Skip tests that depend on external stylesheets or Shadow DOM
      if (usesExternalStylesheets(entry.html) || usesShadowDom(entry.html)) {
        test.skip(testName, async () => {});
        continue;
      }

      test(testName, async ({ page }) => {
        let violations: any[] = [];
        let navigationDestroyed = false;

        try {
          await page.setContent(entry.html, { waitUntil: "domcontentloaded" });
          violations = await runRuleByActId(page, entry.actRuleId);
        } catch (e: any) {
          // Meta refresh with delay=0 causes instant navigation, destroying
          // the execution context. This is expected for passing meta-refresh
          // test cases (instant redirect = no delay = acceptable).
          if (
            NAVIGATION_RULES.has(coreRuleId) &&
            (e.message?.includes("Execution context was destroyed") ||
              e.message?.includes("navigation"))
          ) {
            navigationDestroyed = true;
            violations = []; // No violations = passes
          } else {
            throw e;
          }
        }

        const hasViolations = violations.length > 0;

        if (entry.expected === "failed") {
          expect(
            hasViolations,
            `Expected violations for "${entry.testcaseTitle}" but got none${navigationDestroyed ? " (page navigated away)" : ""}`,
          ).toBe(true);
        } else {
          expect(
            hasViolations,
            `Expected no violations for "${entry.testcaseTitle}" but got ${violations.length}`,
          ).toBe(false);
        }
      });
    }
  });
}
