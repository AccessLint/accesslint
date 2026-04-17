import { describe, it } from "vitest";
import { svgImgAlt } from "./svg-img-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/svg-img-alt";

describe(RULE_ID, () => {
  it("reports svg with role=img and no accessible name", () => {
    expectViolations(svgImgAlt, '<svg role="img"><circle r="10"></circle></svg>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes svg with role=img and aria-label", () => {
    expectNoViolations(
      svgImgAlt,
      '<svg role="img" aria-label="Logo"><circle r="10"></circle></svg>',
    );
  });

  it("passes svg with role=img and aria-labelledby", () => {
    expectNoViolations(
      svgImgAlt,
      '<span id="desc">Logo</span><svg role="img" aria-labelledby="desc"><circle r="10"></circle></svg>',
    );
  });

  it("passes svg with role=img and child <title>", () => {
    expectNoViolations(
      svgImgAlt,
      '<svg role="img"><title>Company logo</title><circle r="10"></circle></svg>',
    );
  });

  it("passes svg with role=img and title attribute", () => {
    expectNoViolations(svgImgAlt, '<svg role="img" title="Logo"><circle r="10"></circle></svg>');
  });

  it("skips aria-hidden svg", () => {
    expectNoViolations(
      svgImgAlt,
      '<svg role="img" aria-hidden="true"><circle r="10"></circle></svg>',
    );
  });

  it("reports elements with role=graphics-document without name", () => {
    expectViolations(
      svgImgAlt,
      '<svg role="graphics-document"><rect width="100" height="100"></rect></svg>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports elements with role=graphics-symbol without name", () => {
    expectViolations(svgImgAlt, '<g role="graphics-symbol"><circle r="5"></circle></g>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("ignores svg without role=img", () => {
    expectNoViolations(svgImgAlt, '<svg><circle r="10"></circle></svg>');
  });

  it("reports svg with empty <title>", () => {
    expectViolations(svgImgAlt, '<svg role="img"><title>  </title><circle r="10"></circle></svg>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
