import { describe, it, expect, beforeEach } from "vitest";
import { makeDoc } from "../test-helpers";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rules, clearAllCaches } from "../rules/index";
import { ACT_TO_CORE_RULE } from "./act-mapping";
import type { FixtureEntry } from "./earl-report";

const FIXTURE_PATH = resolve(
  import.meta.dirname,
  "../../act-fixtures/act-testcases.json",
);
const fixturesExist = existsSync(FIXTURE_PATH);

function loadFixtures(): FixtureEntry[] {
  if (!fixturesExist) return [];
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf-8"));
}


/**
 * Performance smoke test: runs all ACT fixtures through their corresponding
 * rules in happy-dom. This validates that rules don't crash on real-world HTML
 * and provides a performance baseline. Conformance assertions live in the
 * browser tests (Playwright) which have full CSS/layout fidelity.
 */
describe.skipIf(!fixturesExist)("ACT Performance", () => {
  const fixtures = loadFixtures();

  // Group by core rule ID (translate fixture's old slug to accesslintNNNN via ACT mapping)
  const byRule = new Map<string, FixtureEntry[]>();
  for (const entry of fixtures) {
    const newId = ACT_TO_CORE_RULE[entry.actRuleId];
    if (!newId) continue;
    const list = byRule.get(newId) ?? [];
    list.push(entry);
    byRule.set(newId, list);
  }

  const ruleMap = new Map(rules.map((r) => [r.id, r]));

  for (const [ruleId, entries] of byRule) {
    const rule = ruleMap.get(ruleId);
    if (!rule) {
      it(`${ruleId}: rule not found`, () => {
        expect.fail(`Rule "${ruleId}" not found in rules array`);
      });
      continue;
    }

    const actRuleId = entries[0].actRuleId;

    describe(`${ruleId} (ACT ${actRuleId})`, () => {
      beforeEach(() => {
        clearAllCaches();
      });

      for (const entry of entries) {
        it(`[${entry.expected}] ${entry.testcaseTitle}`, () => {
          const doc = makeDoc(entry.html);
          // Run the rule — we only care that it doesn't throw
          rule.run(doc);
        });
      }
    });
  }
});
