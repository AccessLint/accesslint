/**
 * Generate a W3C EARL (Evaluation and Report Language) JSON-LD report
 * from ACT conformance test results.
 *
 * Format expected by the ACT Implementation Generator at:
 *   https://act-implementor.netlify.app/
 *
 * The top-level object is the assertor with an `assertedThat` array
 * containing flat assertions (the JSON-LD reverse of `assertedBy`).
 *
 * @see https://www.w3.org/TR/EARL10-Schema/
 */

export interface FixtureEntry {
  testcaseId: string;
  testcaseTitle: string;
  actRuleId: string;
  actRuleName: string;
  coreRuleId: string;
  expected: "passed" | "failed" | "inapplicable";
  html: string;
}

export interface FixtureOutcome {
  testcaseId: string;
  testcaseTitle: string;
  actRuleId: string;
  coreRuleId: string;
  expected: "passed" | "failed" | "inapplicable";
  actual: "passed" | "failed" | "cantTell";
  correct: boolean;
}

export interface EarlAssertion {
  "@type": "Assertion";
  mode: "earl:automatic";
  subject: {
    "@type": "TestSubject";
    source: string;
  };
  test: {
    "@type": "TestCase";
    title: string;
    isPartOf: { "@type": "TestRequirement"; title: string }[];
  };
  result: {
    "@type": "TestResult";
    outcome: `earl:${string}`;
  };
}

export interface EarlReport {
  "@context": string;
  "@type": ["Project", "Assertor"];
  name: string;
  shortdesc: string;
  description: string;
  homepage: string;
  license: string;
  vendor: string;
  release: {
    "@type": "Version";
    revision: string;
    created: string;
  };
  assertedThat: EarlAssertion[];
}

const ACT_TESTCASE_URL_PREFIX = "https://www.w3.org/WAI/content-assets/wcag-act-rules/testcases";
const ACT_RULE_URL_PREFIX = "https://www.w3.org/WAI/standards-guidelines/act/rules";

/**
 * Whether an actual outcome satisfies the expected outcome per ACT semantics.
 * The engine cannot distinguish "passed" from "inapplicable", so either one
 * satisfies an expected "passed" or "inapplicable".
 */
export function isCorrectOutcome(
  expected: "passed" | "failed" | "inapplicable",
  actual: "passed" | "failed" | "cantTell" | "inapplicable",
): boolean {
  if (actual === "cantTell") return false;
  if (expected === "failed") return actual === "failed";
  // expected is "passed" or "inapplicable" — either actual satisfies
  return actual === "passed" || actual === "inapplicable";
}

export function generateEarlReport(outcomes: FixtureOutcome[], version: string): EarlReport {
  const assertions: EarlAssertion[] = outcomes.map((outcome) => ({
    "@type": "Assertion",
    mode: "earl:automatic",
    subject: {
      "@type": "TestSubject",
      source: `${ACT_TESTCASE_URL_PREFIX}/${outcome.actRuleId}/${outcome.testcaseId}.html`,
    },
    test: {
      "@type": "TestCase",
      title: outcome.coreRuleId,
      isPartOf: [
        {
          "@type": "TestRequirement" as const,
          title: `${ACT_RULE_URL_PREFIX}/${outcome.actRuleId}/`,
        },
      ],
    },
    result: {
      "@type": "TestResult",
      outcome: `earl:${outcome.actual}`,
    },
  }));

  return {
    "@context": "https://act-rules.github.io/earl-context.json",
    "@type": ["Project", "Assertor"],
    name: "@accesslint/core",
    shortdesc: "Pure accessibility rule engine with zero browser dependencies",
    description:
      "Automated WCAG 2.2 accessibility testing engine covering Level A and AA, with best-practice rules included. Runs in any browser or DOM environment with zero dependencies.",
    homepage: "https://github.com/AccessLint/accesslint/tree/main/core",
    license: "https://raw.githubusercontent.com/AccessLint/accesslint/main/core/LICENSE",
    vendor: "AccessLint",
    release: {
      "@type": "Version",
      revision: version,
      created: new Date().toISOString().slice(0, 10),
    },
    assertedThat: assertions,
  };
}
