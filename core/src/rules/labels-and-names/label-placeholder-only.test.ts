import { describe, it } from "vitest";
import { labelPlaceholderOnly } from "./label-placeholder-only";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/label-placeholder-only";

describe(RULE_ID, () => {
  it("reports input with only placeholder attribute", () => {
    expectViolations(labelPlaceholderOnly, '<input type="text" placeholder="Username">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes input with label element", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<label for="user">Username</label><input id="user" type="text" placeholder="Username">',
    );
  });

  it("passes input with aria-label", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<input type="text" placeholder="Username" aria-label="Username">',
    );
  });

  it("passes input with aria-labelledby", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<span id="lbl">Username</span><input type="text" placeholder="Username" aria-labelledby="lbl">',
    );
  });

  it("passes input with title", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<input type="text" placeholder="Username" title="Username">',
    );
  });

  it("passes input wrapped in label", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<label>Username <input type="text" placeholder="Enter username"></label>',
    );
  });

  it("passes input without placeholder", () => {
    expectNoViolations(labelPlaceholderOnly, '<input type="text">');
  });

  it("passes input with empty placeholder", () => {
    expectNoViolations(labelPlaceholderOnly, '<input type="text" placeholder="">');
  });

  it("reports textarea with only placeholder", () => {
    expectViolations(labelPlaceholderOnly, '<textarea placeholder="Enter message"></textarea>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips select elements (no placeholder support)", () => {
    expectNoViolations(labelPlaceholderOnly, "<select><option>A</option></select>");
  });

  it("skips hidden inputs", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<input type="hidden" placeholder="Token" value="abc">',
    );
  });

  it("skips submit buttons", () => {
    expectNoViolations(labelPlaceholderOnly, '<input type="submit" placeholder="Submit form">');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      labelPlaceholderOnly,
      '<input type="text" placeholder="Username" aria-hidden="true">',
    );
  });

  it("reports input with whitespace-only label", () => {
    expectViolations(
      labelPlaceholderOnly,
      '<label for="x">   </label><input id="x" type="text" placeholder="Username">',
      { count: 1, ruleId: RULE_ID },
    );
  });
});
