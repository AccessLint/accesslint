import { describe, it } from "vitest";
import { objectAlt } from "./object-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/object-alt";

describe(RULE_ID, () => {
  it("reports object without alternative text", () => {
    expectViolations(
      objectAlt,
      '<object data="movie.swf" type="application/x-shockwave-flash"></object>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes object with aria-label", () => {
    expectNoViolations(objectAlt, '<object data="movie.swf" aria-label="Animated logo"></object>');
  });

  it("passes object with aria-labelledby", () => {
    expectNoViolations(
      objectAlt,
      '<span id="desc">Logo animation</span><object data="movie.swf" aria-labelledby="desc"></object>',
    );
  });

  it("flags object with only text fallback content (not an accessible name)", () => {
    expectViolations(
      objectAlt,
      '<object data="movie.swf">Flash animation of company logo</object>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes object with title", () => {
    expectNoViolations(
      objectAlt,
      '<object data="movie.swf" title="Company logo animation"></object>',
    );
  });

  it("passes decorative object with role=presentation", () => {
    expectNoViolations(objectAlt, '<object data="decoration.swf" role="presentation"></object>');
  });

  it("passes decorative object with role=none", () => {
    expectNoViolations(objectAlt, '<object data="decoration.swf" role="none"></object>');
  });

  it("skips aria-hidden objects", () => {
    expectNoViolations(objectAlt, '<object data="movie.swf" aria-hidden="true"></object>');
  });

  it("reports object with empty fallback", () => {
    expectViolations(objectAlt, '<object data="movie.swf">   </object>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
