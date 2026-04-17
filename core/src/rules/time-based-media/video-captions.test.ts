import { describe, it } from "vitest";
import { videoCaptions } from "./video-captions";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "time-based-media/video-captions";

describe(RULE_ID, () => {
  it("reports video without captions track", () => {
    expectViolations(
      videoCaptions,
      '<html><body><video src="movie.mp4"></video></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes video with captions track", () => {
    expectNoViolations(
      videoCaptions,
      `
      <html><body>
        <video src="movie.mp4">
          <track kind="captions" src="captions.vtt">
        </video>
      </body></html>
    `,
    );
  });

  it("passes video with subtitles track", () => {
    // Subtitles are accepted as a valid caption alternative
    expectNoViolations(
      videoCaptions,
      `
      <html><body>
        <video src="movie.mp4">
          <track kind="subtitles" src="subs.vtt">
        </video>
      </body></html>
    `,
    );
  });

  it("reports video with wrong track kind (descriptions)", () => {
    expectViolations(
      videoCaptions,
      `
      <html><body>
        <video src="movie.mp4">
          <track kind="descriptions" src="desc.vtt">
        </video>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("skips muted background videos", () => {
    expectNoViolations(
      videoCaptions,
      '<html><body><video src="bg.mp4" muted autoplay loop></video></body></html>',
    );
  });

  it("skips aria-hidden video", () => {
    expectNoViolations(
      videoCaptions,
      '<html><body><video src="movie.mp4" aria-hidden="true"></video></body></html>',
    );
  });

  it("skips computed-hidden video", () => {
    expectNoViolations(
      videoCaptions,
      '<html><body><video src="movie.mp4" style="display:none"></video></body></html>',
    );
  });

  it("skips autoplay-only video", () => {
    expectNoViolations(
      videoCaptions,
      '<html><body><video src="bg.mp4" autoplay></video></body></html>',
    );
  });
});
