import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isComputedHidden } from "../utils/aria";

export const inputButtonName: Rule = {
  id: "labels-and-names/input-button-name",
  category: "labels-and-names",
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the button to see its visual purpose, then set value or aria-label to describe the action.",
  description:
    "Input buttons must have discernible text via value, aria-label, or aria-labelledby.",
  guidance:
    "Input buttons (<input type='submit'>, type='button', type='reset'>) need accessible names so users know what action the button performs. Add a value attribute with descriptive text (e.g., value='Submit Form'), or use aria-label if the value must differ from the accessible name.",
  run(doc) {
    const violations = [];
    for (const input of doc.querySelectorAll(
      'input[type="submit"], input[type="button"], input[type="reset"]',
    )) {
      if (isAriaHidden(input)) continue;
      if (isComputedHidden(input)) continue;
      const value = input.getAttribute("value")?.trim();
      // submit and reset inputs have browser-default labels when value is absent
      const type = input.getAttribute("type")?.toLowerCase();
      const hasDefaultLabel =
        (type === "submit" || type === "reset") && !input.hasAttribute("value");
      if (!value && !hasDefaultLabel && !getAccessibleName(input)) {
        violations.push({
          ruleId: "labels-and-names/input-button-name",
          selector: getSelector(input),
          html: getHtmlSnippet(input),
          impact: "critical" as const,
          message: "Input button has no discernible text.",
          fix: { type: "add-attribute", attribute: "value", value: "" } as const,
        });
      }
    }
    return violations;
  },
};
