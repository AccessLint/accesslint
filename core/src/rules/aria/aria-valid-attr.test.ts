import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaValidAttr } from "./aria-valid-attr";

const RULE_ID = "aria/aria-valid-attr";

describe(RULE_ID, () => {
  it("passes valid aria attributes", () => {
    expectNoViolations(ariaValidAttr, '<html><body><div aria-label="test"></div></body></html>');
  });

  it("reports invalid aria attributes", () => {
    expectViolations(ariaValidAttr, '<html><body><div aria-foo="bar"></div></body></html>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /aria-foo/,
    });
  });
});
