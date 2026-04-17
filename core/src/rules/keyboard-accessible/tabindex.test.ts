import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { tabindex } from "./tabindex";

const RULE_ID = "keyboard-accessible/tabindex";

describe(RULE_ID, () => {
  it("reports positive tabindex", () => {
    expectViolations(tabindex, '<html><body><div tabindex="5">X</div></body></html>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes tabindex=0", () => {
    expectNoViolations(tabindex, '<html><body><div tabindex="0">X</div></body></html>');
  });

  it("passes tabindex=-1", () => {
    expectNoViolations(tabindex, '<html><body><div tabindex="-1">X</div></body></html>');
  });
});
