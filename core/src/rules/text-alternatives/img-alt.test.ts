import { describe, it } from "vitest";
import { imgAlt } from "./img-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/img-alt";

describe(RULE_ID, () => {
  it("reports images missing alt attribute", () => {
    expectViolations(imgAlt, '<html><body><img src="photo.jpg"></body></html>', {
      count: 1,
      ruleId: RULE_ID,
      impact: "critical",
    });
  });

  it("reports multiple violations with correct selectors", () => {
    expectViolations(imgAlt, '<html><body><img src="a.jpg"><img src="b.jpg"></body></html>', {
      count: 2,
      ruleId: RULE_ID,
    });
  });

  it.each([
    ["alt attribute", '<img src="photo.jpg" alt="A photo">'],
    ["empty alt (decorative)", '<img src="bg.jpg" alt="">'],
    ["role=presentation", '<img src="bg.jpg" role="presentation">'],
    ["role=none", '<img src="bg.jpg" role="none">'],
    ["aria-label", '<img src="logo.png" aria-label="Company logo">'],
    ["aria-labelledby", '<span id="desc">Photo</span><img src="x.jpg" aria-labelledby="desc">'],
    ["aria-hidden", '<img src="x.jpg" aria-hidden="true">'],
    ["hidden attribute", '<img src="pixel.gif" hidden>'],
  ])("passes images with %s", (_label, body) => {
    expectNoViolations(imgAlt, `<html><body>${body}</body></html>`);
  });
});
