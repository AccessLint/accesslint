import { describe, it, expect } from "vitest";
import { labelPlaceholderOnly } from "./label-placeholder-only";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/label-placeholder-only", () => {
  it("reports input with only placeholder attribute", () => {
    const doc = makeDoc('<input type="text" placeholder="Username">');
    const violations = labelPlaceholderOnly.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("labels-and-names/label-placeholder-only");
  });

  it("passes input with label element", () => {
    const doc = makeDoc('<label for="user">Username</label><input id="user" type="text" placeholder="Username">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with aria-label", () => {
    const doc = makeDoc('<input type="text" placeholder="Username" aria-label="Username">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with aria-labelledby", () => {
    const doc = makeDoc('<span id="lbl">Username</span><input type="text" placeholder="Username" aria-labelledby="lbl">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with title", () => {
    const doc = makeDoc('<input type="text" placeholder="Username" title="Username">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input wrapped in label", () => {
    const doc = makeDoc('<label>Username <input type="text" placeholder="Enter username"></label>');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input without placeholder", () => {
    const doc = makeDoc('<input type="text">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with empty placeholder", () => {
    const doc = makeDoc('<input type="text" placeholder="">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("reports textarea with only placeholder", () => {
    const doc = makeDoc('<textarea placeholder="Enter message"></textarea>');
    const violations = labelPlaceholderOnly.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips select elements (no placeholder support)", () => {
    const doc = makeDoc('<select><option>A</option></select>');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("skips hidden inputs", () => {
    const doc = makeDoc('<input type="hidden" placeholder="Token" value="abc">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("skips submit buttons", () => {
    const doc = makeDoc('<input type="submit" placeholder="Submit form">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<input type="text" placeholder="Username" aria-hidden="true">');
    expect(labelPlaceholderOnly.run(doc)).toHaveLength(0);
  });

  it("reports input with whitespace-only label", () => {
    const doc = makeDoc('<label for="x">   </label><input id="x" type="text" placeholder="Username">');
    const violations = labelPlaceholderOnly.run(doc);
    expect(violations).toHaveLength(1);
  });
});
