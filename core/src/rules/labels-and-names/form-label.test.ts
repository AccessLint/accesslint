import { describe, it, expect } from "vitest";
import { formLabel } from "./form-label";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/form-label", () => {
  it("reports input without label", () => {
    const doc = makeDoc('<html><body><input type="text"></body></html>');
    const v = formLabel.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("labels-and-names/form-label");
  });

  it("passes input with aria-label", () => {
    const doc = makeDoc('<html><body><input type="text" aria-label="Name"></body></html>');
    expect(formLabel.run(doc)).toHaveLength(0);
  });

  it("passes input with associated label", () => {
    const doc = makeDoc('<html><body><label for="n">Name</label><input id="n" type="text"></body></html>');
    expect(formLabel.run(doc)).toHaveLength(0);
  });

  it("passes input wrapped in label", () => {
    const doc = makeDoc('<html><body><label>Name <input type="text"></label></body></html>');
    expect(formLabel.run(doc)).toHaveLength(0);
  });

  it("ignores hidden inputs", () => {
    const doc = makeDoc('<html><body><input type="hidden"></body></html>');
    expect(formLabel.run(doc)).toHaveLength(0);
  });

  it("ignores submit/button/reset inputs", () => {
    const doc = makeDoc('<html><body><input type="submit"><input type="button"><input type="reset"></body></html>');
    expect(formLabel.run(doc)).toHaveLength(0);
  });

  it("reports textarea without label", () => {
    const doc = makeDoc("<html><body><textarea></textarea></body></html>");
    expect(formLabel.run(doc)).toHaveLength(1);
  });

  it("reports select without label", () => {
    const doc = makeDoc("<html><body><select></select></body></html>");
    expect(formLabel.run(doc)).toHaveLength(1);
  });

  it("reports select with options but no label", () => {
    const doc = makeDoc("<html><body><select><option>England</option></select></body></html>");
    expect(formLabel.run(doc)).toHaveLength(1);
  });
});
