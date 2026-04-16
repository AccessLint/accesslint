import { describe, it, expect } from "vitest";
import { videoCaptions } from "./video-captions";
import { makeDoc } from "../../test-helpers";

describe("time-based-media/video-captions", () => {
  it("reports video without captions track", () => {
    const doc = makeDoc('<html><body><video src="movie.mp4"></video></body></html>');
    const violations = videoCaptions.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("time-based-media/video-captions");
  });

  it("passes video with captions track", () => {
    const doc = makeDoc(`
      <html><body>
        <video src="movie.mp4">
          <track kind="captions" src="captions.vtt">
        </video>
      </body></html>
    `);
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });

  it("passes video with subtitles track", () => {
    const doc = makeDoc(`
      <html><body>
        <video src="movie.mp4">
          <track kind="subtitles" src="subs.vtt">
        </video>
      </body></html>
    `);
    // Subtitles are accepted as a valid caption alternative
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });

  it("reports video with wrong track kind (descriptions)", () => {
    const doc = makeDoc(`
      <html><body>
        <video src="movie.mp4">
          <track kind="descriptions" src="desc.vtt">
        </video>
      </body></html>
    `);
    const violations = videoCaptions.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips muted background videos", () => {
    const doc = makeDoc('<html><body><video src="bg.mp4" muted autoplay loop></video></body></html>');
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden video", () => {
    const doc = makeDoc('<html><body><video src="movie.mp4" aria-hidden="true"></video></body></html>');
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });

  it("skips computed-hidden video", () => {
    const doc = makeDoc('<html><body><video src="movie.mp4" style="display:none"></video></body></html>');
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });

  it("skips autoplay-only video", () => {
    const doc = makeDoc('<html><body><video src="bg.mp4" autoplay></video></body></html>');
    expect(videoCaptions.run(doc)).toHaveLength(0);
  });
});
