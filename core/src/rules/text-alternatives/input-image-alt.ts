import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden } from "../utils/aria";

export const inputImageAlt: Rule = {
  id: "text-alternatives/input-image-alt",
  category: "text-alternatives",
  actRuleIds: ["59796f"],
  wcag: ["1.1.1", "4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint: "Screenshot the image button to see its icon, then set alt to describe the action (e.g., 'Search', 'Submit').",
  description: 'Image inputs (<input type="image">) must have alternate text describing the button action.',
  guidance:
    "Image buttons (<input type='image'>) act as submit buttons with a custom image. Add alt text via alt, aria-label, or aria-labelledby that describes the action (e.g. alt='Search' or alt='Submit order'), not the image itself. Without it, screen readers announce only 'image' or the filename, giving no clue what the button does.",
  run(doc) {
    const violations = [];
    for (const input of doc.querySelectorAll('input[type="image"]')) {
      if (isAriaHidden(input)) continue;
      if (!getAccessibleName(input)) {
        violations.push({
          ruleId: "text-alternatives/input-image-alt",
          selector: getSelector(input),
          html: getHtmlSnippet(input),
          impact: "critical" as const,
          message: "Image input missing alt text.",
          fix: { type: "add-attribute", attribute: "alt", value: "" } as const,
        });
      }
    }
    return violations;
  },
};
