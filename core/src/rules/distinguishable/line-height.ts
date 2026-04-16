import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { getCachedComputedStyle } from "../utils/color";
import {
  getImportantValue,
  anyTextViolatesPx,
  isHtmlElement,
  isOffscreen,
  hasAffectedText,
  hasHorizontalOnlyScroll,
} from "./text-spacing-helpers";

export const lineHeight: Rule = {
  id: "distinguishable/line-height",
  category: "distinguishable",
  actRuleIds: ["78fd32"],
  wcag: ["1.4.12"],
  level: "AA",
  fixability: "mechanical",
  description:
    "Line height set with !important in style attributes must be at least 1.5.",
  guidance:
    "WCAG 1.4.12 requires users to be able to override text spacing. Using !important on line-height with a value below 1.5 prevents this. Either increase the value to at least 1.5 or remove !important.",
  run(doc) {
    const violations: { ruleId: string; selector: string; html: string; impact: "serious"; message: string }[] = [];

    for (const el of doc.querySelectorAll("[style]")) {
      if (isAriaHidden(el)) continue;
      if (!isHtmlElement(el)) continue;
      if (isOffscreen(el)) continue;
      if (!hasAffectedText(el, "line-height")) continue;
      // Line-height is only relevant when text wraps vertically
      if (hasHorizontalOnlyScroll(el)) continue;
      // Line-height only matters for multi-line text — skip single-line elements.
      // In jsdom, scrollHeight is 0 (no layout engine) so this guard is
      // effectively a no-op there; the check only activates in browser contexts.
      if (el instanceof HTMLElement && el.scrollHeight > 0) {
        const lh = parseFloat(getCachedComputedStyle(el).lineHeight);
        if (lh > 0 && el.scrollHeight <= lh * 1.5) continue;
      }

      const result = getImportantValue(el, "line-height");
      if (!result) continue;

      let violates = false;
      if (result.em !== null) {
        violates = result.em < 1.5;
      } else if (result.px !== null) {
        violates = anyTextViolatesPx(el, "line-height", result.px, 1.5);
      }

      if (violates) {
        const displayValue = result.em !== null ? `${result.em}` : `${result.px}px`;
        violations.push({
          ruleId: "distinguishable/line-height",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: `Line height ${displayValue} with !important is below the 1.5 minimum.`,
        });
      }
    }

    return violations;
  },
};
