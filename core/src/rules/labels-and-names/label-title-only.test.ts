import { describe, it, expect } from "vitest";
import { labelTitleOnly } from "./label-title-only";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/label-title-only", () => {
  it("reports input with only title attribute", () => {
    const doc = makeDoc('<input type="text" title="Search">');
    const violations = labelTitleOnly.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("labels-and-names/label-title-only");
  });

  it("passes input with label element", () => {
    const doc = makeDoc('<label for="search">Search</label><input id="search" type="text" title="Enter keywords">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with aria-label", () => {
    const doc = makeDoc('<input type="text" title="Search" aria-label="Search">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with aria-labelledby", () => {
    const doc = makeDoc('<span id="lbl">Search</span><input type="text" title="Search" aria-labelledby="lbl">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes input wrapped in label", () => {
    const doc = makeDoc('<label>Search <input type="text" title="Enter keywords"></label>');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes input without title", () => {
    const doc = makeDoc('<input type="text">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes input with empty title", () => {
    const doc = makeDoc('<input type="text" title="">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("reports select with only title", () => {
    const doc = makeDoc('<select title="Choose option"><option>A</option></select>');
    const violations = labelTitleOnly.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports textarea with only title", () => {
    const doc = makeDoc('<textarea title="Enter message"></textarea>');
    const violations = labelTitleOnly.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips hidden inputs", () => {
    const doc = makeDoc('<input type="hidden" title="Token" value="abc">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("skips submit buttons", () => {
    const doc = makeDoc('<input type="submit" title="Submit form">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<input type="text" title="Search" aria-hidden="true">');
    expect(labelTitleOnly.run(doc)).toHaveLength(0);
  });

  it("passes label with empty text but whitespace", () => {
    const doc = makeDoc('<label for="x">   </label><input id="x" type="text" title="Search">');
    const violations = labelTitleOnly.run(doc);
    expect(violations).toHaveLength(1); // Empty label doesn't count
  });
});
