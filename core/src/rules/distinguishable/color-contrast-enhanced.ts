import type { Rule } from "../types";
import { checkContrast } from "./color-contrast-helpers";

export const colorContrastEnhanced: Rule = {
  id: "distinguishable/color-contrast-enhanced",
  category: "distinguishable",
  actRuleIds: ["09o5cg"],
  wcag: ["1.4.6"],
  level: "AAA",
  fixability: "visual",
  description:
    "Text elements must have enhanced color contrast against the background (WCAG AAA).",
  browserHint:
    "Violation context includes computed colors and ratio. After changing colors, use JavaScript to read getComputedStyle() on the element and recalculate the contrast ratio. Screenshot the element to verify the fix looks correct in context.",
  guidance:
    "WCAG SC 1.4.6 (AAA) requires a contrast ratio of at least 7:1 for normal text and 4.5:1 for large text (>=24px or >=18.66px bold). Higher contrast benefits users with low vision, aging eyes, or poor screen conditions. Increase the contrast by darkening the text or lightening the background, or vice versa.",
  run(doc) {
    return checkContrast(doc, "distinguishable/color-contrast-enhanced", "AAA");
  },
};
