import { describe, it } from "vitest";
import { inputImageAlt } from "./input-image-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/input-image-alt";

describe(RULE_ID, () => {
  it("reports input[type=image] without alt", () => {
    expectViolations(inputImageAlt, '<input type="image" src="submit.png">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes input[type=image] with alt", () => {
    expectNoViolations(inputImageAlt, '<input type="image" src="submit.png" alt="Submit">');
  });

  it("passes input[type=image] with aria-label", () => {
    expectNoViolations(inputImageAlt, '<input type="image" src="go.png" aria-label="Go">');
  });

  it("passes input[type=image] with aria-labelledby", () => {
    expectNoViolations(
      inputImageAlt,
      '<span id="lbl">Search</span><input type="image" src="search.png" aria-labelledby="lbl">',
    );
  });

  it("passes input[type=image] with title", () => {
    expectNoViolations(inputImageAlt, '<input type="image" src="go.png" title="Submit form">');
  });

  it("skips aria-hidden input[type=image]", () => {
    expectNoViolations(inputImageAlt, '<input type="image" src="x.png" aria-hidden="true">');
  });

  it("does not flag other input types", () => {
    expectNoViolations(inputImageAlt, '<input type="text"><input type="submit">');
  });

  it("reports multiple violations", () => {
    expectViolations(
      inputImageAlt,
      '<input type="image" src="a.png"><input type="image" src="b.png">',
      { count: 2, ruleId: RULE_ID },
    );
  });
});
