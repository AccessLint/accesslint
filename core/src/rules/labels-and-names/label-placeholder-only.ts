import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { NATIVE_LABELABLE_SELECTOR, findAssociatedLabel } from "./form-constants";

export const labelPlaceholderOnly: Rule = {
  id: "labels-and-names/label-placeholder-only",
  category: "labels-and-names",
  wcag: ["3.3.2"],
  level: "A",
  tags: [],
  fixability: "contextual",
  description: "Form elements should not use placeholder attribute as the only accessible name.",
  guidance:
    "The placeholder attribute disappears as soon as the user begins typing, making it unreliable as a label. Users may forget the field's purpose mid-entry, and placeholders are often rendered with low contrast. Use a visible <label> element, aria-label, or aria-labelledby instead. Placeholder can supplement a label but should not replace it.",
  run(doc) {
    const violations = [];
    const inputs = doc.querySelectorAll(NATIVE_LABELABLE_SELECTOR);

    for (const input of inputs) {
      if (isAriaHidden(input)) continue;

      // Only applies to elements that support placeholder
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) continue;

      const hasPlaceholder = !!input.getAttribute("placeholder")?.trim();
      if (!hasPlaceholder) continue;

      const hasAriaLabel = !!input.getAttribute("aria-label")?.trim();
      const hasAriaLabelledby = input.hasAttribute("aria-labelledby");
      const hasTitle = !!input.getAttribute("title")?.trim();
      const hasLabel = !!findAssociatedLabel(input)?.textContent?.trim();

      if (!hasAriaLabel && !hasAriaLabelledby && !hasLabel && !hasTitle) {
        violations.push({
          ruleId: "labels-and-names/label-placeholder-only",
          selector: getSelector(input),
          html: getHtmlSnippet(input),
          impact: "serious" as const,
          message:
            "Form element uses placeholder as only label. Use <label>, aria-label, or aria-labelledby instead.",
          fix: {
            type: "suggest",
            suggestion:
              "Add a visible <label> element or aria-label attribute, and optionally keep the placeholder as supplementary hint text",
          } as const,
        });
      }
    }

    return violations;
  },
};
