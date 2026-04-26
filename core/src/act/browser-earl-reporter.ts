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
 * Each ACT test carries testInfo annotations ({ type, description }) for
 * expected / actRuleId / coreRuleId / testcaseId.
 */
function readAnnotation(
  annotations: readonly { type: string; description?: string }[],
  type: string,
): string | undefined {
  return annotations.find((a) => a.type === type)?.description;
}

export default class BrowserEarlReporter implements Reporter {
  private outcomes: FixtureOutcome[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    const annotations = test.annotations;
    const actRuleId = readAnnotation(annotations, "actRuleId");
    const coreRuleId = readAnnotation(annotations, "coreRuleId");
    const testcaseId = readAnnotation(annotations, "testcaseId");
    const expectedRaw = readAnnotation(annotations, "expected");
    if (!actRuleId || !coreRuleId || !testcaseId || !expectedRaw) return;
    if (expectedRaw !== "passed" && expectedRaw !== "failed" && expectedRaw !== "inapplicable")
      return;
    const expected = expectedRaw;

    const status = result.status; // "passed" | "failed" | "timedOut" | "skipped" | "interrupted"
    const testcaseTitle = test.title.replace(/^\[[^\]]+\]\s*/, "");

    // Skipped tests (external stylesheets, Shadow DOM) can't be evaluated —
    // record as cantTell so the EARL report reflects total coverage.
    if (status === "skipped" || status === "timedOut" || status === "interrupted") {
      this.outcomes.push({
        testcaseId,
        testcaseTitle,
        actRuleId,
        coreRuleId,
        expected,
        actual: "cantTell",
        correct: isCorrectOutcome(expected, "cantTell"),
      });
      return;
    }

    // The tool distinguishes "inapplicable" via the applicable() guard on each
    // rule. When the test runner detects inapplicability it pushes an annotation.
    const isInapplicable = result.annotations?.some(
      (a) => a.type === "inapplicable" && a.description === "true",
    );
    let actual: "passed" | "failed" | "cantTell" | "inapplicable";
    if (status === "passed") {
      if (isInapplicable) {
        actual = "inapplicable";
      } else {
        // violations found → failed, no violations → passed.
        actual = expected === "failed" ? "failed" : "passed";
      }
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
