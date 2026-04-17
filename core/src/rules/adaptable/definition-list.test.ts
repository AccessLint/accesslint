import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { definitionList } from "./definition-list";

const RULE_ID = "adaptable/definition-list";

describe(RULE_ID, () => {
  it("passes valid dl", () => {
    expectNoViolations(definitionList, "<html><body><dl><dt>T</dt><dd>D</dd></dl></body></html>");
  });

  it("reports invalid child in dl", () => {
    expectViolations(definitionList, "<html><body><dl><p>Bad</p></dl></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports bare text node in dl", () => {
    expectViolations(definitionList, "<html><body><dl>Bare text<dt>T</dt><dd>D</dd></dl></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /<dt>/,
    });
  });
});
