import { describe, it, expect } from "vitest";
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

  it("accepts a lone significant word next to a decorative glyph", () => {
    expectNoViolations(
      labelContentMismatch,
      `
      <a href="/deploy" aria-label="Deploy on Vercel">
        <span>▲</span>
        <span>Deploy</span>
      </a>
    `,
    );
  });

  it("still reports a lone word the name does not contain", () => {
    expectViolations(labelContentMismatch, '<button aria-label="Save changes">Cancel</button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("ignores punctuation the name trails the visible text with", () => {
    expectNoViolations(labelContentMismatch, '<button aria-label="Submit,">Submit now</button>');
  });

  it("treats a hyphen and a space as the same separator", () => {
    expectNoViolations(
      labelContentMismatch,
      '<a href="/" aria-label="Sign-in, please">Sign in</a>',
    );
  });

  // A card link wraps its title alongside author, date, and category tags. The
  // title is the label a voice-control user speaks; the rest is not.
  const card = (title: string, label: string, tags: string[]) => `
    <a href="/post" aria-label="${label}">
      <div class="card">
        <h3>${title}</h3>
        <div><span>Field Notes</span> <span>May 29, 2026</span></div>
        <div>${tags.map((t) => `<span>${t}</span>`).join(" ")}</div>
      </div>
      <svg aria-hidden="true"><path d="M0 256a256"/></svg>
    </a>
  `;

  it("passes a card whose name is the title plus a stray comma", () => {
    expectNoViolations(
      labelContentMismatch,
      card("The Shape of Quiet Rivers", "The Shape of Quiet Rivers, ", [
        "Essays",
        "Talks",
        "Video",
      ]),
    );
  });

  it("judges identical cards the same however much metadata they carry", () => {
    expectNoViolations(
      labelContentMismatch,
      card("Where Do Migrating Swifts Sleep?", "Where Do Migrating Swifts Sleep?, ", ["Essays"]) +
        card("The Shape of Quiet Rivers", "The Shape of Quiet Rivers, ", [
          "Essays",
          "Talks",
          "Video",
          "Interviews",
          "Field guides",
        ]),
    );
  });

  it("passes a card whose name wraps the title in extra words", () => {
    expectNoViolations(
      labelContentMismatch,
      card("Widget Review", "Read more: Widget Review", ["Essays", "Reviews"]),
    );
  });

  it("still reports a card whose name drops the title", () => {
    expectViolations(labelContentMismatch, card("Widget Review", "Read more", ["Essays"]), {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("quotes the page's own words when the markup indents them", () => {
    const [violation] = expectViolations(
      labelContentMismatch,
      `<button aria-label="  Send   the form  ">
         <span>Submit</span>
         <span>now</span>
       </button>`,
      { count: 1, ruleId: RULE_ID },
    );
    expect(violation.message).toBe(
      'Accessible name "Send the form" does not contain visible text "Submit now".',
    );
  });
});
