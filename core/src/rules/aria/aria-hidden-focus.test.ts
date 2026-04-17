import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaHiddenFocus } from "./aria-hidden-focus";

const RULE_ID = "aria/aria-hidden-focus";

describe(RULE_ID, () => {
  it("passes when aria-hidden region has no focusable elements", () => {
    expectNoViolations(ariaHiddenFocus, '<div aria-hidden="true"><p>Just text</p></div>');
  });

  it("reports focusable button in aria-hidden region", () => {
    expectViolations(ariaHiddenFocus, '<div aria-hidden="true"><button>Click</button></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports focusable link in aria-hidden region", () => {
    expectViolations(ariaHiddenFocus, '<div aria-hidden="true"><a href="/page">Link</a></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports focusable input in aria-hidden region", () => {
    expectViolations(ariaHiddenFocus, '<div aria-hidden="true"><input type="text"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes when focusable elements have tabindex=-1", () => {
    expectNoViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><button tabindex="-1">Hidden</button></div>',
    );
  });

  it("passes when button is disabled", () => {
    expectNoViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><button disabled>Disabled</button></div>',
    );
  });

  it("passes for hidden input type", () => {
    expectNoViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><input type="hidden" name="token"></div>',
    );
  });

  it("reports element with positive tabindex", () => {
    expectViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><span tabindex="0">Focusable</span></div>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("reports multiple focusable elements", () => {
    expectViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><button>One</button><button>Two</button></div>',
      {
        count: 2,
        ruleId: RULE_ID,
      },
    );
  });

  it("checks nested aria-hidden regions", () => {
    expectViolations(
      ariaHiddenFocus,
      '<div aria-hidden="true"><div><button>Nested</button></div></div>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });
});
