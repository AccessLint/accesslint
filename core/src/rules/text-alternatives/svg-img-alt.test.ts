import { describe, it, expect } from "vitest";
import { svgImgAlt } from "./svg-img-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/svg-img-alt", () => {
  it("reports svg with role=img and no accessible name", () => {
    const doc = makeDoc('<svg role="img"><circle r="10"></circle></svg>');
    const violations = svgImgAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/svg-img-alt");
  });

  it("passes svg with role=img and aria-label", () => {
    const doc = makeDoc('<svg role="img" aria-label="Logo"><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("passes svg with role=img and aria-labelledby", () => {
    const doc = makeDoc('<span id="desc">Logo</span><svg role="img" aria-labelledby="desc"><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("passes svg with role=img and child <title>", () => {
    const doc = makeDoc('<svg role="img"><title>Company logo</title><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("passes svg with role=img and title attribute", () => {
    const doc = makeDoc('<svg role="img" title="Logo"><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden svg", () => {
    const doc = makeDoc('<svg role="img" aria-hidden="true"><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("reports elements with role=graphics-document without name", () => {
    const doc = makeDoc('<svg role="graphics-document"><rect width="100" height="100"></rect></svg>');
    const violations = svgImgAlt.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports elements with role=graphics-symbol without name", () => {
    const doc = makeDoc('<g role="graphics-symbol"><circle r="5"></circle></g>');
    const violations = svgImgAlt.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("ignores svg without role=img", () => {
    const doc = makeDoc('<svg><circle r="10"></circle></svg>');
    expect(svgImgAlt.run(doc)).toHaveLength(0);
  });

  it("reports svg with empty <title>", () => {
    const doc = makeDoc('<svg role="img"><title>  </title><circle r="10"></circle></svg>');
    const violations = svgImgAlt.run(doc);
    expect(violations).toHaveLength(1);
  });
});
