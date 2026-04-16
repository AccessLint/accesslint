import { describe, it, expect } from "vitest";
import { roleImgAlt } from "./role-img-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/role-img-alt", () => {
  it("reports div with role=img without name", () => {
    const doc = makeDoc('<div role="img" style="background: url(icon.png)"></div>');
    const violations = roleImgAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/role-img-alt");
  });

  it("passes div with role=img and aria-label", () => {
    const doc = makeDoc('<div role="img" aria-label="Warning icon"></div>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("passes div with role=img and aria-labelledby", () => {
    const doc = makeDoc('<span id="desc">Warning icon</span><div role="img" aria-labelledby="desc"></div>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("passes span with role=img and text content", () => {
    // Icon fonts often use this pattern
    const doc = makeDoc('<span role="img" aria-label="Star rating">&#9733;&#9733;&#9733;</span>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("skips native img elements (handled by img-alt)", () => {
    const doc = makeDoc('<img role="img" src="photo.jpg">');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("skips svg elements (handled by svg-img-alt)", () => {
    const doc = makeDoc('<svg role="img"><circle r="10"></circle></svg>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<div role="img" aria-hidden="true"></div>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });

  it("reports i element used as icon without label", () => {
    const doc = makeDoc('<i role="img" class="icon-home"></i>');
    const violations = roleImgAlt.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes i element with aria-label", () => {
    const doc = makeDoc('<i role="img" class="icon-home" aria-label="Home"></i>');
    expect(roleImgAlt.run(doc)).toHaveLength(0);
  });
});
