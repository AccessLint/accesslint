import { describe, it } from "vitest";
import { labelContentMismatch } from "./label-content-mismatch";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/label-content-mismatch";

describe(RULE_ID, () => {
  it("passes button without aria-label", () => {
    expectNoViolations(labelContentMismatch, "<button>Submit</button>");
  });

  it("passes button with matching aria-label", () => {
    expectNoViolations(labelContentMismatch, '<button aria-label="Submit form">Submit</button>');
  });

  it("reports button with mismatched aria-label", () => {
    expectViolations(labelContentMismatch, '<button aria-label="Send email">Submit</button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes when aria-label contains visible text", () => {
    expectNoViolations(
      labelContentMismatch,
      '<button aria-label="Submit order form">Submit</button>',
    );
  });

  it("reports link with completely mismatched aria-label", () => {
    expectViolations(labelContentMismatch, '<a href="/" aria-label="Navigate to start">Home</a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes link with matching aria-label", () => {
    expectNoViolations(labelContentMismatch, '<a href="/" aria-label="Home page">Home</a>');
  });

  it("passes input submit without aria override", () => {
    expectNoViolations(labelContentMismatch, '<input type="submit" value="Submit">');
  });

  it("is case-insensitive", () => {
    expectNoViolations(labelContentMismatch, '<button aria-label="SUBMIT form">Submit</button>');
  });

  it("normalizes whitespace", () => {
    expectNoViolations(labelContentMismatch, '<button aria-label="Submit   form">Submit</button>');
  });

  it("reports input with aria-label not matching visible label", () => {
    expectViolations(
      labelContentMismatch,
      `
      <label for="email">Email address</label>
      <input id="email" type="email" aria-label="Enter your contact email">
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes input with aria-label containing visible label", () => {
    expectNoViolations(
      labelContentMismatch,
      `
      <label for="email">Email</label>
      <input id="email" type="email" aria-label="Email address">
    `,
    );
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(
      labelContentMismatch,
      '<button aria-label="Different" aria-hidden="true">Submit</button>',
    );
  });

  it("ignores style tags inside elements (not visible text)", () => {
    expectNoViolations(
      labelContentMismatch,
      `
      <a href="/video" aria-label="Ulta Beauty Black-owned and Founded favorites">
        Ulta Beauty Black-owned and Founded favorites
        <style>video::cue { color: white; font-family: sans-serif; }</style>
      </a>
    `,
    );
  });

  it("ignores deeply nested style tags with no other visible text", () => {
    expectNoViolations(
      labelContentMismatch,
      `
      <a aria-label="Watch video" href="/video/123/">
        <div><div><div>
          <style>video::cue { color: white; font-size: 18px; }</style>
          <div><video preload="auto" src="video.mp4"><track kind="captions"></video></div>
        </div></div></div>
      </a>
    `,
    );
  });

  it("ignores script tags inside elements (not visible text)", () => {
    expectNoViolations(
      labelContentMismatch,
      `
      <button aria-label="Play video">
        Play video
        <script>console.log("init")</script>
      </button>
    `,
    );
  });

  it("skips icon buttons (SVG not considered visible text)", () => {
    expectNoViolations(
      labelContentMismatch,
      '<button aria-label="Close"><svg aria-hidden="true"></svg></button>',
    );
  });
});
