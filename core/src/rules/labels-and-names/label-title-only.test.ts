import { describe, it } from "vitest";
import { labelTitleOnly } from "./label-title-only";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/label-title-only";

describe(RULE_ID, () => {
  it("reports input with only title attribute", () => {
    expectViolations(labelTitleOnly, '<input type="text" title="Search">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes input with label element", () => {
    expectNoViolations(
      labelTitleOnly,
      '<label for="search">Search</label><input id="search" type="text" title="Enter keywords">',
    );
  });

  it("passes input with aria-label", () => {
    expectNoViolations(labelTitleOnly, '<input type="text" title="Search" aria-label="Search">');
  });

  it("passes input with aria-labelledby", () => {
    expectNoViolations(
      labelTitleOnly,
      '<span id="lbl">Search</span><input type="text" title="Search" aria-labelledby="lbl">',
    );
  });

  it("passes input wrapped in label", () => {
    expectNoViolations(
      labelTitleOnly,
      '<label>Search <input type="text" title="Enter keywords"></label>',
    );
  });

  it("passes input without title", () => {
    expectNoViolations(labelTitleOnly, '<input type="text">');
  });

  it("passes input with empty title", () => {
    expectNoViolations(labelTitleOnly, '<input type="text" title="">');
  });

  it("reports select with only title", () => {
    expectViolations(labelTitleOnly, '<select title="Choose option"><option>A</option></select>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports textarea with only title", () => {
    expectViolations(labelTitleOnly, '<textarea title="Enter message"></textarea>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("skips hidden inputs", () => {
    expectNoViolations(labelTitleOnly, '<input type="hidden" title="Token" value="abc">');
  });

  it("skips submit buttons", () => {
    expectNoViolations(labelTitleOnly, '<input type="submit" title="Submit form">');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(labelTitleOnly, '<input type="text" title="Search" aria-hidden="true">');
  });

  it("passes label with empty text but whitespace", () => {
    expectViolations(
      labelTitleOnly,
      '<label for="x">   </label><input id="x" type="text" title="Search">',
      { count: 1, ruleId: RULE_ID },
    );
  });
});
