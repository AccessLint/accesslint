import { describe, it } from "vitest";
import { multipleLabels } from "./multiple-labels";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/multiple-labels";

describe(RULE_ID, () => {
  it("reports input with multiple label[for] elements", () => {
    expectViolations(
      multipleLabels,
      `
      <label for="x">First</label>
      <label for="x">Second</label>
      <input id="x" type="text">
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports input with label[for] and wrapping label", () => {
    expectViolations(
      multipleLabels,
      `
      <label for="x">Explicit</label>
      <label><input id="x" type="text"></label>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes input with single label", () => {
    expectNoViolations(
      multipleLabels,
      `
      <label for="x">Name</label>
      <input id="x" type="text">
    `,
    );
  });

  it("passes input with no label", () => {
    expectNoViolations(multipleLabels, '<input id="x" type="text">');
  });

  it("skips input without id", () => {
    expectNoViolations(multipleLabels, '<input type="text">');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      multipleLabels,
      `
      <label for="x">First</label>
      <label for="x">Second</label>
      <input id="x" type="text" aria-hidden="true">
    `,
    );
  });
});
