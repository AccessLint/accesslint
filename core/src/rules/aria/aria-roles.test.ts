import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaRoles } from "./aria-roles";

const RULE_ID = "aria/aria-roles";

describe(RULE_ID, () => {
  it("passes valid roles", () => {
    expectNoViolations(ariaRoles, '<html><body><div role="button">Click</div></body></html>');
  });

  it("reports invalid roles", () => {
    expectViolations(ariaRoles, '<html><body><div role="foobar">X</div></body></html>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /foobar/,
    });
  });

  it("passes multiple valid roles", () => {
    expectNoViolations(ariaRoles, '<html><body><nav role="navigation">Nav</nav></body></html>');
  });
});
