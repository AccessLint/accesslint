import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, FOCUSABLE_SELECTOR } from "../utils/aria";

export const focusVisible: Rule = {
  id: "keyboard-accessible/focus-visible",
  category: "keyboard-accessible",
  actRuleIds: ["oj04fd"],
  wcag: ["2.4.7"],
  level: "AA",
  fixability: "visual",
  browserHint:
    "Tab to the element and screenshot to verify a visible focus indicator appears. Check that the indicator has sufficient contrast against the background.",
  description: "Elements in sequential focus order must have a visible focus indicator.",
  guidance:
    "Keyboard users need to see which element has focus. Do not remove the default focus outline (outline: none) without providing an alternative visible indicator. Use :focus-visible or :focus styles to ensure focus is always perceivable.",
  run(doc) {
    const violations = [];

    for (const el of doc.querySelectorAll(FOCUSABLE_SELECTOR)) {
      if (isAriaHidden(el)) continue;
      if (!(el instanceof HTMLElement)) continue;

      // Check inline styles that explicitly remove focus indicators
      const style = el.getAttribute("style") || "";
      const hasOutlineNone = /outline\s*:\s*(none|0)\s*(;|$|!)/i.test(style);

      if (hasOutlineNone) {
        // Check if there's a compensating border or box-shadow
        const hasBorder = /border\s*:/i.test(style);
        const hasBoxShadow = /box-shadow\s*:/i.test(style);
        if (!hasBorder && !hasBoxShadow) {
          violations.push({
            ruleId: "keyboard-accessible/focus-visible",
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "serious" as const,
            message: "Focusable element has outline removed without a visible focus alternative.",
          });
        }
      }
    }

    return violations;
  },
};
