import { describe, it } from "vitest";
import { summaryName } from "./summary-name";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/summary-name";

describe(RULE_ID, () => {
  it("passes summary with text content", () => {
    expectNoViolations(
      summaryName,
      "<html><body><details><summary>More info</summary>details</details></body></html>",
    );
  });

  it("passes summary with aria-label", () => {
    expectNoViolations(
      summaryName,
      "<html><body><details><summary aria-label='Show more'></summary>x</details></body></html>",
    );
  });

  it("passes summary with aria-labelledby to an existing id", () => {
    expectNoViolations(
      summaryName,
      "<html><body><span id='n'>More</span><details><summary aria-labelledby='n'></summary>x</details></body></html>",
    );
  });

  it("passes summary with img alt providing name", () => {
    expectNoViolations(
      summaryName,
      "<html><body><details><summary><img src='x' alt='Info'></summary>x</details></body></html>",
    );
  });

  it("ignores non-first summary children of details", () => {
    expectNoViolations(
      summaryName,
      "<html><body><details><summary>First</summary><summary></summary>x</details></body></html>",
    );
  });

  it("reports empty summary", () => {
    expectViolations(
      summaryName,
      "<html><body><details><summary></summary>x</details></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports summary containing only whitespace", () => {
    expectViolations(
      summaryName,
      "<html><body><details><summary>   </summary>x</details></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports summary whose aria-labelledby points to a missing id", () => {
    expectViolations(
      summaryName,
      "<html><body><details><summary aria-labelledby='missing'></summary>x</details></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
  });
});
