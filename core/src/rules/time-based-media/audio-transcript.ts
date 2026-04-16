import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, isComputedHidden } from "../utils/aria";

export const audioTranscript: Rule = {
  id: "time-based-media/audio-transcript",
  category: "time-based-media",
  actRuleIds: ["e7aa44"],
  wcag: ["1.2.1"],
  level: "A",
  fixability: "contextual",
  browserHint: "Inspect the page around the audio element for existing transcript links or associated text content.",
  description: "Audio elements should have a text alternative or transcript.",
  guidance: "Audio-only content like podcasts or recordings needs a text alternative for deaf users. Provide a transcript either on the same page or linked nearby. The transcript should include all spoken content and descriptions of relevant sounds.",
  run(doc) {
    const violations = [];

    for (const audio of doc.querySelectorAll("audio")) {
      if (isAriaHidden(audio)) continue;
      if (isComputedHidden(audio)) continue;

      // Check for track element with captions or descriptions
      const track = audio.querySelector('track[kind="captions"], track[kind="descriptions"]');
      if (track) continue;

      // Check for aria-describedby pointing to transcript
      if (audio.hasAttribute("aria-describedby")) continue;

      // Check for nearby transcript link or content
      const parent = audio.parentElement;
      if (parent) {
        const transcriptLink = parent.querySelector('a[href*="transcript"], a[href*="text"]');
        if (transcriptLink) continue;
      }

      violations.push({
        ruleId: "time-based-media/audio-transcript",
        selector: getSelector(audio),
        html: getHtmlSnippet(audio),
        impact: "critical" as const,
        message: "Audio element has no transcript or text alternative. Add a transcript or track element.",
      });
    }

    return violations;
  },
};
