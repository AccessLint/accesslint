/**
 * CI conformance gate: reads the browser EARL report and fails if any
 * enabled rule drops below 80% ACT conformance.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EarlReport } from "./earl-report";

const EARL_PATH = resolve(
  import.meta.dirname,
  "../../act-fixtures/earl-report-browser.json",
);
const FIXTURES_PATH = resolve(
  import.meta.dirname,
  "../../act-fixtures/act-testcases.json",
);
const THRESHOLD = 0.8;

interface RuleStats {
  total: number;
  passed: number;
  failed: number;
  cantTell: number;
}

interface Fixture {
  testcaseId: string;
  expected: "passed" | "failed" | "inapplicable";
}

function main() {
  let report: EarlReport;
  try {
    report = JSON.parse(readFileSync(EARL_PATH, "utf-8"));
  } catch {
    console.error(`Failed to read EARL report at ${EARL_PATH}`);
    console.error("Run 'npm run test:browser' first to generate the report.");
    process.exit(1);
  }

  // Build a lookup from testcaseId to expected outcome
  let fixtures: Fixture[];
  try {
    fixtures = JSON.parse(readFileSync(FIXTURES_PATH, "utf-8"));
  } catch {
    console.error(`Failed to read fixtures at ${FIXTURES_PATH}`);
    process.exit(1);
  }
  const expectedByTestcase = new Map<string, string>();
  for (const f of fixtures) {
    expectedByTestcase.set(f.testcaseId, f.expected);
  }

  // Aggregate per core-rule stats from flat assertedThat array
  const ruleStats = new Map<string, RuleStats>();
  const ruleActIds = new Map<string, Set<string>>();

  for (const assertion of report.assertedThat) {
    // Use the core rule ID (stored as test.title) as the aggregation key
    const coreRuleId = assertion.test.title;

    // Track ACT rule IDs for display
    const ruleUrl = assertion.test.isPartOf[0].title;
    const actMatch = ruleUrl.match(/\/rules\/([^/]+)\//);
    if (actMatch) {
      const actIds = ruleActIds.get(coreRuleId) ?? new Set();
      actIds.add(actMatch[1]);
      ruleActIds.set(coreRuleId, actIds);
    }

    // Extract testcase ID from subject source URL
    const sourceMatch = assertion.subject.source.match(/\/([^/]+)\.html$/);
    if (!sourceMatch) continue;
    const testcaseId = sourceMatch[1];

    const expected = expectedByTestcase.get(testcaseId);
    if (!expected) continue;

    // Determine correctness per ACT conformance:
    // - "passed" satisfies expected "passed" or "inapplicable"
    // - "failed" satisfies expected "failed"
    // - "inapplicable" satisfies expected "passed" or "inapplicable"
    const actualOutcome = assertion.result.outcome.replace("earl:", "");
    const correct =
      actualOutcome === expected ||
      (expected === "inapplicable" && (actualOutcome === "passed" || actualOutcome === "inapplicable")) ||
      (expected === "passed" && actualOutcome === "inapplicable");

    const stats = ruleStats.get(coreRuleId) ?? { total: 0, passed: 0, failed: 0, cantTell: 0 };
    stats.total++;

    if (correct) stats.passed++;
    else if (actualOutcome === "cantTell") stats.cantTell++;
    else stats.failed++;

    ruleStats.set(coreRuleId, stats);
  }

  let hasFailures = false;

  console.log("\n=== ACT Conformance Gate (Browser) ===\n");
  console.log(
    "Rule".padEnd(40) +
    "Total".padEnd(8) +
    "Pass".padEnd(8) +
    "Fail".padEnd(8) +
    "Rate".padEnd(10) +
    "Status",
  );
  console.log("-".repeat(85));

  for (const [coreRuleId, stats] of [...ruleStats].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const actIds = ruleActIds.get(coreRuleId);
    const label = actIds?.size
      ? `${coreRuleId} (${[...actIds].sort().join(", ")})`
      : coreRuleId;

    // For rate calculation, exclude cantTell assertions
    const testable = stats.passed + stats.failed;
    const rate = testable > 0 ? stats.passed / testable : 1;
    const rateStr = (rate * 100).toFixed(1) + "%";

    const status = rate >= THRESHOLD ? "OK" : "FAIL";
    if (rate < THRESHOLD) hasFailures = true;

    console.log(
      label.padEnd(40) +
      String(stats.total).padEnd(8) +
      String(stats.passed).padEnd(8) +
      String(stats.failed).padEnd(8) +
      rateStr.padEnd(10) +
      status,
    );
  }

  console.log("-".repeat(85));

  if (hasFailures) {
    console.error("Conformance gate FAILED: one or more enabled rules below 80% ACT conformance.");
    process.exit(1);
  } else {
    console.log("Conformance gate PASSED.\n");
  }
}

main();
