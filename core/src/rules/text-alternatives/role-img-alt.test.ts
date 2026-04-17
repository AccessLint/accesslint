import { describe, it } from "vitest";
import { roleImgAlt } from "./role-img-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/role-img-alt";

describe(RULE_ID, () => {
  it("reports div with role=img without name", () => {
    expectViolations(
      roleImgAlt,
      '<div role="img" style="background: url(icon.png)"></div>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes div with role=img and aria-label", () => {
    expectNoViolations(roleImgAlt, '<div role="img" aria-label="Warning icon"></div>');
  });

  it("passes div with role=img and aria-labelledby", () => {
    expectNoViolations(
      roleImgAlt,
      '<span id="desc">Warning icon</span><div role="img" aria-labelledby="desc"></div>',
    );
  });

  it("passes span with role=img and text content", () => {
    // Icon fonts often use this pattern
    expectNoViolations(
      roleImgAlt,
      '<span role="img" aria-label="Star rating">&#9733;&#9733;&#9733;</span>',
    );
  });

  it("skips native img elements (handled by img-alt)", () => {
    expectNoViolations(roleImgAlt, '<img role="img" src="photo.jpg">');
  });

  it("skips svg elements (handled by svg-img-alt)", () => {
    expectNoViolations(roleImgAlt, '<svg role="img"><circle r="10"></circle></svg>');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(roleImgAlt, '<div role="img" aria-hidden="true"></div>');
  });

  it("reports i element used as icon without label", () => {
    expectViolations(roleImgAlt, '<i role="img" class="icon-home"></i>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes i element with aria-label", () => {
    expectNoViolations(roleImgAlt, '<i role="img" class="icon-home" aria-label="Home"></i>');
  });
});
