import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { focusOrder } from "./focus-order";

const RULE_ID = "keyboard-accessible/focus-order";

describe(RULE_ID, () => {
  it("reports non-interactive element with tabindex=0 and no role", () => {
    expectViolations(focusOrder, '<div tabindex="0">Custom widget</div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /div/,
    });
  });

  it("passes non-interactive element with tabindex=0 and a role", () => {
    expectNoViolations(focusOrder, '<div tabindex="0" role="button">Custom button</div>');
  });

  it("passes interactive elements with tabindex=0", () => {
    expectNoViolations(focusOrder, '<button tabindex="0">Button</button>');
  });
});
