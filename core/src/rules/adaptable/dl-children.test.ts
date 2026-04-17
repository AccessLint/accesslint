import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { dlChildren } from "./dl-children";

const RULE_ID = "adaptable/dl-children";

describe(RULE_ID, () => {
  it("passes dt/dd inside dl", () => {
    expectNoViolations(dlChildren, "<html><body><dl><dt>T</dt><dd>D</dd></dl></body></html>");
  });

  it("passes dt/dd inside div inside dl", () => {
    expectNoViolations(
      dlChildren,
      "<html><body><dl><div><dt>T</dt><dd>D</dd></div></dl></body></html>",
    );
  });

  it("reports dt outside dl", () => {
    expectViolations(dlChildren, "<html><body><dt>Bad</dt></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
