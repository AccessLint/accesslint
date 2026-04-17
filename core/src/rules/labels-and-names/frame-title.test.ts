import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { frameTitle } from "./frame-title";

const RULE_ID = "labels-and-names/frame-title";

describe(RULE_ID, () => {
  it("reports iframe without title", () => {
    expectViolations(frameTitle, '<html><body><iframe src="page.html"></iframe></body></html>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports iframe with empty title", () => {
    expectViolations(
      frameTitle,
      '<html><body><iframe src="page.html" title=""></iframe></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes iframe with title", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe src="page.html" title="Video player"></iframe></body></html>',
    );
  });

  it("passes iframe with aria-label", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe src="page.html" aria-label="Video player"></iframe></body></html>',
    );
  });

  it("passes iframe with aria-labelledby", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><span id="label">Video player</span><iframe src="page.html" aria-labelledby="label"></iframe></body></html>',
    );
  });

  it("skips aria-hidden iframes", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe src="page.html" aria-hidden="true"></iframe></body></html>',
    );
  });

  it("skips hidden tracking iframes (visibility:hidden)", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe height="1" width="1" style="position: absolute; top: 0px; left: 0px; border: none; visibility: hidden;"></iframe></body></html>',
    );
  });

  it("skips hidden tracking iframes (display:none)", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe src="track.html" style="display:none"></iframe></body></html>',
    );
  });

  it("skips 0x0 iframes", () => {
    expectNoViolations(
      frameTitle,
      '<html><body><iframe src="track.html" width="0" height="0"></iframe></body></html>',
    );
  });
});
