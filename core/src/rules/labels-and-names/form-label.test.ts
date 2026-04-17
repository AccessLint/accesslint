import { describe, it } from "vitest";
import { formLabel } from "./form-label";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/form-label";

describe(RULE_ID, () => {
  it("reports input without label", () => {
    expectViolations(formLabel, '<html><body><input type="text"></body></html>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes input with aria-label", () => {
    expectNoViolations(
      formLabel,
      '<html><body><input type="text" aria-label="Name"></body></html>',
    );
  });

  it("passes input with associated label", () => {
    expectNoViolations(
      formLabel,
      '<html><body><label for="n">Name</label><input id="n" type="text"></body></html>',
    );
  });

  it("passes input wrapped in label", () => {
    expectNoViolations(
      formLabel,
      '<html><body><label>Name <input type="text"></label></body></html>',
    );
  });

  it("ignores hidden inputs", () => {
    expectNoViolations(formLabel, '<html><body><input type="hidden"></body></html>');
  });

  it("ignores submit/button/reset inputs", () => {
    expectNoViolations(
      formLabel,
      '<html><body><input type="submit"><input type="button"><input type="reset"></body></html>',
    );
  });

  it("reports textarea without label", () => {
    expectViolations(formLabel, "<html><body><textarea></textarea></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports select without label", () => {
    expectViolations(formLabel, "<html><body><select></select></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports select with options but no label", () => {
    expectViolations(
      formLabel,
      "<html><body><select><option>England</option></select></body></html>",
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });
});
