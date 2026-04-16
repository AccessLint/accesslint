import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaInputFieldName } from "./aria-input-field-name";


describe("labels-and-names/aria-input-field-name", () => {
  it("passes textbox with aria-label", () => {
    const doc = makeDoc('<div role="textbox" aria-label="Username"></div>');
    expect(ariaInputFieldName.run(doc)).toHaveLength(0);
  });

  it("reports textbox without name", () => {
    const doc = makeDoc('<div role="textbox"></div>');
    const violations = ariaInputFieldName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes combobox with name", () => {
    const doc = makeDoc('<div role="combobox" aria-label="Country"></div>');
    expect(ariaInputFieldName.run(doc)).toHaveLength(0);
  });

  it("reports slider without name", () => {
    const doc = makeDoc('<div role="slider" aria-valuenow="50"></div>');
    const violations = ariaInputFieldName.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips native inputs (handled by label rule)", () => {
    const doc = makeDoc('<input type="text">');
    expect(ariaInputFieldName.run(doc)).toHaveLength(0);
  });
});
