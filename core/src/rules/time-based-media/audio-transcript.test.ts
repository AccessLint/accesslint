import { describe, it } from "vitest";
import { audioTranscript } from "./audio-transcript";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "time-based-media/audio-transcript";

describe(RULE_ID, () => {
  it("reports audio without transcript", () => {
    // DOM-only runtimes don't apply UA stylesheet for audio, so explicit display is needed
    expectViolations(
      audioTranscript,
      '<html><body><audio src="podcast.mp3" controls style="display:block"></audio></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes audio with captions track", () => {
    expectNoViolations(
      audioTranscript,
      `
      <html><body>
        <audio src="podcast.mp3" controls>
          <track kind="captions" src="transcript.vtt">
        </audio>
      </body></html>
    `,
    );
  });

  it("passes audio with descriptions track", () => {
    expectNoViolations(
      audioTranscript,
      `
      <html><body>
        <audio src="podcast.mp3" controls>
          <track kind="descriptions" src="desc.vtt">
        </audio>
      </body></html>
    `,
    );
  });

  it("passes audio with aria-describedby", () => {
    expectNoViolations(
      audioTranscript,
      `
      <html><body>
        <p id="transcript">Full transcript here...</p>
        <audio src="podcast.mp3" aria-describedby="transcript"></audio>
      </body></html>
    `,
    );
  });

  it("passes audio with nearby transcript link", () => {
    expectNoViolations(
      audioTranscript,
      `
      <html><body>
        <div>
          <audio src="podcast.mp3" controls></audio>
          <a href="/transcript">View transcript</a>
        </div>
      </body></html>
    `,
    );
  });

  it("skips aria-hidden audio", () => {
    expectNoViolations(
      audioTranscript,
      '<html><body><audio src="podcast.mp3" aria-hidden="true"></audio></body></html>',
    );
  });

  it("skips computed-hidden audio", () => {
    expectNoViolations(
      audioTranscript,
      '<html><body><audio src="podcast.mp3" style="display:none"></audio></body></html>',
    );
  });
});
