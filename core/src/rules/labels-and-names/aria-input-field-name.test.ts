import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { ariaInputFieldName } from "./aria-input-field-name";

const RULE_ID = "labels-and-names/aria-input-field-name";

describe(RULE_ID, () => {
  it("passes textbox with aria-label", () => {
    expectNoViolations(ariaInputFieldName, '<div role="textbox" aria-label="Username"></div>');
  });

  it("reports textbox without name", () => {
    expectViolations(ariaInputFieldName, '<div role="textbox"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes combobox with name", () => {
    expectNoViolations(ariaInputFieldName, '<div role="combobox" aria-label="Country"></div>');
  });

  it("reports slider without name", () => {
    expectViolations(ariaInputFieldName, '<div role="slider" aria-valuenow="50"></div>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips native inputs (handled by label rule)", () => {
    expectNoViolations(ariaInputFieldName, '<input type="text">');
  });
});
