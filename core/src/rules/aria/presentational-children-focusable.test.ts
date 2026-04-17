import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { presentationalChildrenFocusable } from "./presentational-children-focusable";

const RULE_ID = "aria/presentational-children-focusable";

describe(RULE_ID, () => {
  it("reports focusable link inside role=option", () => {
    expectViolations(
      presentationalChildrenFocusable,
      '<li role="option"><a href="/page">Link</a></li>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("reports focusable button inside role=tab", () => {
    expectViolations(
      presentationalChildrenFocusable,
      '<div role="tab"><button>Click</button></div>',
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("skips link with tabindex=-1 inside role=option", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<li role="option"><a href="/page" tabindex="-1">Link</a></li>',
    );
  });

  it("skips disabled button inside role=tab", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="tab"><button disabled>Click</button></div>',
    );
  });

  it("skips elements without children-presentational role", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="group"><a href="/page">Link</a></div>',
    );
  });

  it("skips aria-hidden subtrees", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<li role="option" aria-hidden="true"><a href="/page">Link</a></li>',
    );
  });

  it("reports input inside role=img", () => {
    expectViolations(presentationalChildrenFocusable, '<div role="img"><input type="text"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips input with tabindex=-1 inside role=img", () => {
    expectNoViolations(
      presentationalChildrenFocusable,
      '<div role="img"><input type="text" tabindex="-1"></div>',
    );
  });
});
