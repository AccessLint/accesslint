import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaToggleFieldName } from "./aria-toggle-field-name";

const RULE_ID = "labels-and-names/aria-toggle-field-name";

describe(RULE_ID, () => {
  it("passes checkbox with name", () => {
    expectNoViolations(
      ariaToggleFieldName,
      '<div role="checkbox" aria-checked="false">Subscribe</div>',
    );
  });

  it("reports checkbox without name", () => {
    expectViolations(ariaToggleFieldName, '<div role="checkbox" aria-checked="false"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes switch with aria-label", () => {
    expectNoViolations(
      ariaToggleFieldName,
      '<div role="switch" aria-checked="true" aria-label="Dark mode"></div>',
    );
  });

  it("skips native checkboxes", () => {
    expectNoViolations(ariaToggleFieldName, '<input type="checkbox">');
  });
});
