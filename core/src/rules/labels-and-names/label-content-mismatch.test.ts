import { describe, it, expect } from "vitest";
import { labelContentMismatch } from "./label-content-mismatch";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/label-content-mismatch", () => {
  it("passes button without aria-label", () => {
    const doc = makeDoc("<button>Submit</button>");
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("passes button with matching aria-label", () => {
    const doc = makeDoc('<button aria-label="Submit form">Submit</button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("reports button with mismatched aria-label", () => {
    const doc = makeDoc('<button aria-label="Send email">Submit</button>');
    const violations = labelContentMismatch.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("labels-and-names/label-content-mismatch");
  });

  it("passes when aria-label contains visible text", () => {
    const doc = makeDoc('<button aria-label="Submit order form">Submit</button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("reports link with completely mismatched aria-label", () => {
    const doc = makeDoc('<a href="/" aria-label="Navigate to start">Home</a>');
    const violations = labelContentMismatch.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes link with matching aria-label", () => {
    const doc = makeDoc('<a href="/" aria-label="Home page">Home</a>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("passes input submit without aria override", () => {
    const doc = makeDoc('<input type="submit" value="Submit">');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const doc = makeDoc('<button aria-label="SUBMIT form">Submit</button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("normalizes whitespace", () => {
    const doc = makeDoc('<button aria-label="Submit   form">Submit</button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("reports input with aria-label not matching visible label", () => {
    const doc = makeDoc(`
      <label for="email">Email address</label>
      <input id="email" type="email" aria-label="Enter your contact email">
    `);
    const violations = labelContentMismatch.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes input with aria-label containing visible label", () => {
    const doc = makeDoc(`
      <label for="email">Email</label>
      <input id="email" type="email" aria-label="Email address">
    `);
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<button aria-label="Different" aria-hidden="true">Submit</button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("ignores style tags inside elements (not visible text)", () => {
    const doc = makeDoc(`
      <a href="/video" aria-label="Ulta Beauty Black-owned and Founded favorites">
        Ulta Beauty Black-owned and Founded favorites
        <style>video::cue { color: white; font-family: sans-serif; }</style>
      </a>
    `);
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("ignores deeply nested style tags with no other visible text", () => {
    const doc = makeDoc(`
      <a aria-label="Watch video" href="/video/123/">
        <div><div><div>
          <style>video::cue { color: white; font-size: 18px; }</style>
          <div><video preload="auto" src="video.mp4"><track kind="captions"></video></div>
        </div></div></div>
      </a>
    `);
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("ignores script tags inside elements (not visible text)", () => {
    const doc = makeDoc(`
      <button aria-label="Play video">
        Play video
        <script>console.log("init")</script>
      </button>
    `);
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });

  it("skips icon buttons (SVG not considered visible text)", () => {
    // SVG content is not considered visible label text for this rule
    const doc = makeDoc('<button aria-label="Close"><svg aria-hidden="true"></svg></button>');
    expect(labelContentMismatch.run(doc)).toHaveLength(0);
  });
});
