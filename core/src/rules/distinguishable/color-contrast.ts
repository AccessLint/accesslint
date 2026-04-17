import type { Rule } from "../types";
import { checkContrast } from "./color-contrast-helpers";

export const colorContrast: Rule = {
  id: "distinguishable/color-contrast",
  category: "distinguishable",
  actRuleIds: ["afw4f7"],
  wcag: ["1.4.3"],
  level: "AA",
  fixability: "visual",
  description: "Text elements must have sufficient color contrast against the background.",
  browserHint:
    "Violation context includes computed colors and ratio. After changing colors, use JavaScript to read getComputedStyle() on the element and recalculate the contrast ratio. Screenshot the element to verify the fix looks correct in context.",
  guidance:
    "WCAG SC 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (>=24px or >=18.66px bold). Increase the contrast by darkening the text or lightening the background, or vice versa.",
  run(doc) {
    return checkContrast(doc, "distinguishable/color-contrast", "AA");
  },
};
