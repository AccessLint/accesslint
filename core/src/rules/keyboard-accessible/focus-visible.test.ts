import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { focusVisible } from "./focus-visible";

const RULE_ID = "keyboard-accessible/focus-visible";

describe(RULE_ID, () => {
  it("reports outline:none without alternative", () => {
    expectViolations(focusVisible, '<button style="outline: none;">Click</button>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /outline/,
    });
  });

  it("passes outline:none with border", () => {
    expectNoViolations(
      focusVisible,
      '<button style="outline: none; border: 2px solid blue;">Click</button>',
    );
  });

  it("passes outline:none with box-shadow", () => {
    expectNoViolations(
      focusVisible,
      '<button style="outline: none; box-shadow: 0 0 3px blue;">Click</button>',
    );
  });

  it("passes element with no inline outline style", () => {
    expectNoViolations(focusVisible, "<button>Click</button>");
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      focusVisible,
      '<button style="outline: none;" aria-hidden="true">Hidden</button>',
    );
  });
});
