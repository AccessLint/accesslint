import { describe, it, expect } from "vitest";
import { inputButtonName } from "./input-button-name";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/input-button-name", () => {
  it("reports type=button with empty value", () => {
    const doc = makeDoc('<input type="button" value="">');
    const v = inputButtonName.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("labels-and-names/input-button-name");
  });

  it("reports type=button with no value attribute", () => {
    const doc = makeDoc('<input type="button">');
    const v = inputButtonName.run(doc);
    expect(v).toHaveLength(1);
  });

  it("reports type=submit with empty value (explicit attribute)", () => {
    const doc = makeDoc('<input type="submit" value="">');
    const v = inputButtonName.run(doc);
    expect(v).toHaveLength(1);
  });

  it("passes type=button with value", () => {
    const doc = makeDoc('<input type="button" value="Click me">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("passes type=button with aria-label", () => {
    const doc = makeDoc('<input type="button" aria-label="Click me">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("passes type=button with aria-labelledby", () => {
    const doc = makeDoc('<span id="lbl">Click me</span><input type="button" aria-labelledby="lbl">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("passes type=submit without value (browser default label)", () => {
    const doc = makeDoc('<input type="submit">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("passes type=reset without value (browser default label)", () => {
    const doc = makeDoc('<input type="reset">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<input type="button" aria-hidden="true">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("skips elements inside aria-hidden ancestor", () => {
    const doc = makeDoc('<div aria-hidden="true"><input type="button"></div>');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("skips computed-hidden elements", () => {
    const doc = makeDoc('<input type="button" style="display:none">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });

  it("does not report non-button input types", () => {
    const doc = makeDoc('<input type="text">');
    expect(inputButtonName.run(doc)).toHaveLength(0);
  });
});
