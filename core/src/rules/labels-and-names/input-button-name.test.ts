import { describe, it } from "vitest";
import { inputButtonName } from "./input-button-name";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/input-button-name";

describe(RULE_ID, () => {
  it("reports type=button with empty value", () => {
    expectViolations(inputButtonName, '<input type="button" value="">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports type=button with no value attribute", () => {
    expectViolations(inputButtonName, '<input type="button">', { count: 1, ruleId: RULE_ID });
  });

  it("reports type=submit with empty value (explicit attribute)", () => {
    expectViolations(inputButtonName, '<input type="submit" value="">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes type=button with value", () => {
    expectNoViolations(inputButtonName, '<input type="button" value="Click me">');
  });

  it("passes type=button with aria-label", () => {
    expectNoViolations(inputButtonName, '<input type="button" aria-label="Click me">');
  });

  it("passes type=button with aria-labelledby", () => {
    expectNoViolations(
      inputButtonName,
      '<span id="lbl">Click me</span><input type="button" aria-labelledby="lbl">',
    );
  });

  it("passes type=submit without value (browser default label)", () => {
    expectNoViolations(inputButtonName, '<input type="submit">');
  });

  it("passes type=reset without value (browser default label)", () => {
    expectNoViolations(inputButtonName, '<input type="reset">');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(inputButtonName, '<input type="button" aria-hidden="true">');
  });

  it("skips elements inside aria-hidden ancestor", () => {
    expectNoViolations(inputButtonName, '<div aria-hidden="true"><input type="button"></div>');
  });

  it("skips computed-hidden elements", () => {
    expectNoViolations(inputButtonName, '<input type="button" style="display:none">');
  });

  it("does not report non-button input types", () => {
    expectNoViolations(inputButtonName, '<input type="text">');
  });
});
