import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaAllowedAttr } from "./aria-allowed-attr";

const RULE_ID = "aria/aria-allowed-attr";

describe(RULE_ID, () => {
  it("passes when ARIA attributes are allowed for role", () => {
    expectNoViolations(ariaAllowedAttr, '<button aria-pressed="true">Toggle</button>');
  });

  it("passes global ARIA attributes on any role", () => {
    expectNoViolations(
      ariaAllowedAttr,
      '<div role="button" aria-label="Close" aria-describedby="desc">X</div>',
    );
  });

  it("reports aria-pressed on role=link", () => {
    expectViolations(ariaAllowedAttr, '<div role="link" aria-pressed="true">Link</div>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /aria-pressed.*link/,
    });
  });

  it("reports aria-checked on role=button (without toggle)", () => {
    expectViolations(ariaAllowedAttr, '<div role="button" aria-checked="true">Button</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes aria-checked on checkbox role", () => {
    expectNoViolations(ariaAllowedAttr, '<div role="checkbox" aria-checked="false">Option</div>');
  });

  it("passes aria-expanded on button role", () => {
    expectNoViolations(ariaAllowedAttr, '<button aria-expanded="true">Menu</button>');
  });

  it("reports aria-sort on non-header role", () => {
    expectViolations(ariaAllowedAttr, '<div role="cell" aria-sort="ascending">Value</div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes aria-sort on columnheader", () => {
    expectNoViolations(
      ariaAllowedAttr,
      '<div role="columnheader" aria-sort="ascending">Name</div>',
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      ariaAllowedAttr,
      '<div role="link" aria-pressed="true" aria-hidden="true">Hidden</div>',
    );
  });

  it("checks implicit roles from native elements", () => {
    expectViolations(ariaAllowedAttr, '<button aria-level="2">Button</button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
