import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { generateEarlReport, isCorrectOutcome, type FixtureOutcome } from "./earl-report";

const EARL_OUTPUT_PATH = resolve(
  import.meta.dirname,
  "../../act-fixtures/earl-report-browser.json",
);

const PACKAGE_JSON_PATH = resolve(import.meta.dirname, "../../package.json");

/**
 * Playwright reporter that generates a W3C EARL report from browser ACT tests.
 *
 * Test titles encode metadata as: `[expected] title |act:actRuleId|core:coreRuleId|tc:testcaseId`
 */
export default class BrowserEarlReporter implements Reporter {
  private outcomes: FixtureOutcome[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.title;
    const metaMatch = title.match(
      /\|act:([^|]+)\|core:([^|]+)\|tc:([^|]+)$/,
    );
    if (!metaMatch) return;

    const expectedMatch = title.match(/^\[(passed|failed|inapplicable)\]/);
    if (!expectedMatch) return;

    const actRuleId = metaMatch[1];
    const coreRuleId = metaMatch[2];
    const testcaseId = metaMatch[3];
    const expected = expectedMatch[1] as "passed" | "failed" | "inapplicable";

    const status = result.status; // "passed" | "failed" | "timedOut" | "skipped" | "interrupted"
    const testcaseTitle = title.replace(/\s*\|act:[^|]+\|core:[^|]+\|tc:[^|]+$/, "").replace(/^\[(passed|failed|inapplicable)\]\s*/, "");

    // Skipped tests (external stylesheets, Shadow DOM) can't be evaluated
    if (status === "skipped") return;

    // Timed-out or interrupted tests — outcome couldn't be determined
    if (status === "timedOut" || status === "interrupted") {
      this.outcomes.push({
        testcaseId,
        testcaseTitle,
        actRuleId,
        coreRuleId,
        expected,
        actual: "cantTell",
        correct: false,
      });
      return;
    }

    // The tool only produces two real outcomes: violations (failed) or
    // no violations (passed). It cannot distinguish "inapplicable" from
    // "passed" — report what the tool actually determined.
    let actual: "passed" | "failed" | "cantTell";
    if (status === "passed") {
      // Test passed: the rule produced the expected behavior.
      // violations found → failed, no violations → passed.
      actual = expected === "failed" ? "failed" : "passed";
    } else {
      // Test failed — but was it an assertion mismatch or a runtime error?
      // Playwright sets status="failed" for both; check for an error that
      // isn't an expect() assertion failure to distinguish crashes.
      const isAssertionFailure = result.errors?.some(
        (e) => e.message?.includes("expect(") || e.message?.includes("Expected"),
      );
      if (!isAssertionFailure && result.errors?.length) {
        // Rule threw a runtime error — outcome is indeterminate
        actual = "cantTell";
      } else {
        // Assertion mismatch — invert the expectation
        actual = expected === "failed" ? "passed" : "failed";
      }
    }

    this.outcomes.push({
      testcaseId,
      testcaseTitle,
      actRuleId,
      coreRuleId,
      expected,
      actual,
      correct: isCorrectOutcome(expected, actual),
    });
  }

  onEnd(_result: FullResult): void {
    if (this.outcomes.length === 0) return;

    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8"));

    const report = generateEarlReport(this.outcomes, pkg.version);
    const outputDir = dirname(EARL_OUTPUT_PATH);
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(EARL_OUTPUT_PATH, JSON.stringify(report, null, 2) + "\n");
    console.log(`\nBrowser EARL report written to ${EARL_OUTPUT_PATH}\n`);
  }
}
