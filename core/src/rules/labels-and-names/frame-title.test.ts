import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { frameTitle } from "./frame-title";


describe("labels-and-names/frame-title", () => {
  it("reports iframe without title", () => {
    const doc = makeDoc('<html><body><iframe src="page.html"></iframe></body></html>');
    const violations = frameTitle.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("labels-and-names/frame-title");
  });

  it("reports iframe with empty title", () => {
    const doc = makeDoc('<html><body><iframe src="page.html" title=""></iframe></body></html>');
    const violations = frameTitle.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes iframe with title", () => {
    const doc = makeDoc('<html><body><iframe src="page.html" title="Video player"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("passes iframe with aria-label", () => {
    const doc = makeDoc('<html><body><iframe src="page.html" aria-label="Video player"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("passes iframe with aria-labelledby", () => {
    const doc = makeDoc('<html><body><span id="label">Video player</span><iframe src="page.html" aria-labelledby="label"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden iframes", () => {
    const doc = makeDoc('<html><body><iframe src="page.html" aria-hidden="true"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("skips hidden tracking iframes (visibility:hidden)", () => {
    const doc = makeDoc('<html><body><iframe height="1" width="1" style="position: absolute; top: 0px; left: 0px; border: none; visibility: hidden;"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("skips hidden tracking iframes (display:none)", () => {
    const doc = makeDoc('<html><body><iframe src="track.html" style="display:none"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });

  it("skips 0x0 iframes", () => {
    const doc = makeDoc('<html><body><iframe src="track.html" width="0" height="0"></iframe></body></html>');
    expect(frameTitle.run(doc)).toHaveLength(0);
  });
});
