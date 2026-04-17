import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

/**
 * Matches alt text that starts with a self-referential word used as a prefix.
 * Only flags when the word appears at the start and is followed by a
 * preposition ("of"), a separator (: - — –), or is the entire alt text.
 *
 * Flags:   "image of a dog", "photo: sunset", "icon", "graphic"
 * Skips:   "Close icon for closing window", "Walmart Photo logo",
 *          "magnifying glass icon", "A family taking a photo"
 */
const REDUNDANT_PREFIX_RE =
  /^(image|picture|photo|graphic|icon|img)(\s+of\b|\s*[:\u2013\u2014-]|\s*$)/i;

/**
 * Checks if alt text starts with a self-referential prefix like "image of"
 * or "photo:". Screen readers already announce "image"/"graphic" before alt
 * text, so these prefixes are redundant.  Separate from image-redundant-alt
 * because axe-core does not have an equivalent check.
 */
export const imageAltWords: Rule = {
  id: "text-alternatives/image-alt-words",
  category: "text-alternatives",
  wcag: ["1.1.1"],
  level: "A",
  tags: ["best-practice"],
  fixability: "contextual",
  browserHint:
    "Screenshot the image to verify the alt text accurately describes it without filler words like 'image of'.",
  description:
    "Image alt text should not start with words like 'image of', 'photo of', or 'picture of' — screen readers already announce the element type.",
  guidance:
    "Screen readers already announce 'image' or 'graphic' before reading alt text, so phrases like 'image of', 'photo of', or 'picture of' are redundant. Remove these words and describe what the image shows. For example, change 'image of a dog' to 'golden retriever playing fetch'.",
  run(doc) {
    const violations = [];
    for (const img of doc.querySelectorAll("img[alt]")) {
      const alt = img.getAttribute("alt")!.trim();
      if (!alt) continue;

      const match = alt.match(REDUNDANT_PREFIX_RE);
      if (match) {
        const word = match[1].toLowerCase();
        violations.push({
          ruleId: "text-alternatives/image-alt-words",
          selector: getSelector(img),
          html: getHtmlSnippet(img),
          impact: "minor" as const,
          message: `Alt text "${alt}" starts with redundant prefix "${word}".`,
          context: `Current alt: "${alt}", redundant prefix: "${word}"`,
          fix: {
            type: "suggest",
            suggestion:
              "Remove the redundant prefix from the alt text; screen readers already announce the element as an image",
          } as const,
        });
      }
    }
    return violations;
  },
};
