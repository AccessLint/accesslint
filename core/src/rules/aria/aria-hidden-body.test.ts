import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaHiddenBody } from "./aria-hidden-body";

const RULE_ID = "aria/aria-hidden-body";

describe(RULE_ID, () => {
  it("passes when body has no aria-hidden", () => {
    expectNoViolations(ariaHiddenBody, "<html><body><main>Content</main></body></html>");
  });

  it("passes when body has aria-hidden=false", () => {
    expectNoViolations(ariaHiddenBody, '<html><body aria-hidden="false"><main>Content</main></body></html>');
  });

  it("reports aria-hidden=true on body", () => {
    expectViolations(ariaHiddenBody, '<html><body aria-hidden="true"><main>Content</main></body></html>', {
      count: 1,
      ruleId: RULE_ID,
      impact: "critical",
    });
  });
});
