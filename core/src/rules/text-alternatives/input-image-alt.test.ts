import { describe, it, expect } from "vitest";
import { inputImageAlt } from "./input-image-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/input-image-alt", () => {
  it("reports input[type=image] without alt", () => {
    const doc = makeDoc('<input type="image" src="submit.png">');
    const violations = inputImageAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/input-image-alt");
  });

  it("passes input[type=image] with alt", () => {
    const doc = makeDoc('<input type="image" src="submit.png" alt="Submit">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("passes input[type=image] with aria-label", () => {
    const doc = makeDoc('<input type="image" src="go.png" aria-label="Go">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("passes input[type=image] with aria-labelledby", () => {
    const doc = makeDoc('<span id="lbl">Search</span><input type="image" src="search.png" aria-labelledby="lbl">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("passes input[type=image] with title", () => {
    const doc = makeDoc('<input type="image" src="go.png" title="Submit form">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden input[type=image]", () => {
    const doc = makeDoc('<input type="image" src="x.png" aria-hidden="true">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("does not flag other input types", () => {
    const doc = makeDoc('<input type="text"><input type="submit">');
    expect(inputImageAlt.run(doc)).toHaveLength(0);
  });

  it("reports multiple violations", () => {
    const doc = makeDoc('<input type="image" src="a.png"><input type="image" src="b.png">');
    expect(inputImageAlt.run(doc)).toHaveLength(2);
  });
});
