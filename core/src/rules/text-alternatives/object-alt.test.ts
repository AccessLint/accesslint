import { describe, it, expect } from "vitest";
import { objectAlt } from "./object-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/object-alt", () => {
  it("reports object without alternative text", () => {
    const doc = makeDoc('<object data="movie.swf" type="application/x-shockwave-flash"></object>');
    const violations = objectAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/object-alt");
  });

  it("passes object with aria-label", () => {
    const doc = makeDoc('<object data="movie.swf" aria-label="Animated logo"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("passes object with aria-labelledby", () => {
    const doc = makeDoc('<span id="desc">Logo animation</span><object data="movie.swf" aria-labelledby="desc"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("flags object with only text fallback content (not an accessible name)", () => {
    const doc = makeDoc('<object data="movie.swf">Flash animation of company logo</object>');
    expect(objectAlt.run(doc)).toHaveLength(1);
  });

  it("passes object with title", () => {
    const doc = makeDoc('<object data="movie.swf" title="Company logo animation"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("passes decorative object with role=presentation", () => {
    const doc = makeDoc('<object data="decoration.swf" role="presentation"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("passes decorative object with role=none", () => {
    const doc = makeDoc('<object data="decoration.swf" role="none"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden objects", () => {
    const doc = makeDoc('<object data="movie.swf" aria-hidden="true"></object>');
    expect(objectAlt.run(doc)).toHaveLength(0);
  });

  it("reports object with empty fallback", () => {
    const doc = makeDoc('<object data="movie.swf">   </object>');
    const violations = objectAlt.run(doc);
    expect(violations).toHaveLength(1);
  });
});
