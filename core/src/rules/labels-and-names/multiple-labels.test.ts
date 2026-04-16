import { describe, it, expect } from "vitest";
import { multipleLabels } from "./multiple-labels";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/multiple-labels", () => {
  it("reports input with multiple label[for] elements", () => {
    const doc = makeDoc(`
      <label for="x">First</label>
      <label for="x">Second</label>
      <input id="x" type="text">
    `);
    const v = multipleLabels.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("labels-and-names/multiple-labels");
  });

  it("reports input with label[for] and wrapping label", () => {
    const doc = makeDoc(`
      <label for="x">Explicit</label>
      <label><input id="x" type="text"></label>
    `);
    const v = multipleLabels.run(doc);
    expect(v).toHaveLength(1);
  });

  it("passes input with single label", () => {
    const doc = makeDoc(`
      <label for="x">Name</label>
      <input id="x" type="text">
    `);
    expect(multipleLabels.run(doc)).toHaveLength(0);
  });

  it("passes input with no label", () => {
    const doc = makeDoc('<input id="x" type="text">');
    expect(multipleLabels.run(doc)).toHaveLength(0);
  });

  it("skips input without id", () => {
    const doc = makeDoc('<input type="text">');
    expect(multipleLabels.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc(`
      <label for="x">First</label>
      <label for="x">Second</label>
      <input id="x" type="text" aria-hidden="true">
    `);
    expect(multipleLabels.run(doc)).toHaveLength(0);
  });
});
