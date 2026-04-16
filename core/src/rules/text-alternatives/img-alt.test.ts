import { describe, it, expect } from "vitest";
import { imgAlt } from "./img-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/img-alt", () => {
  it("reports images missing alt attribute", () => {
    const doc = makeDoc('<html><body><img src="photo.jpg"></body></html>');
    const violations = imgAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/img-alt");
  });

  it("passes images with alt attribute", () => {
    const doc = makeDoc('<html><body><img src="photo.jpg" alt="A photo"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("passes images with empty alt (decorative)", () => {
    const doc = makeDoc('<html><body><img src="bg.jpg" alt=""></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("passes images with role=presentation", () => {
    const doc = makeDoc('<html><body><img src="bg.jpg" role="presentation"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("passes images with role=none", () => {
    const doc = makeDoc('<html><body><img src="bg.jpg" role="none"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden images", () => {
    const doc = makeDoc('<html><body><img src="x.jpg" aria-hidden="true"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("skips hidden images", () => {
    const doc = makeDoc('<html><body><img src="pixel.gif" hidden></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("passes images with aria-label", () => {
    const doc = makeDoc('<html><body><img src="logo.png" aria-label="Company logo"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("passes images with aria-labelledby", () => {
    const doc = makeDoc('<html><body><span id="desc">Photo</span><img src="x.jpg" aria-labelledby="desc"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(0);
  });

  it("reports multiple violations", () => {
    const doc = makeDoc('<html><body><img src="a.jpg"><img src="b.jpg"></body></html>');
    expect(imgAlt.run(doc)).toHaveLength(2);
  });
});
