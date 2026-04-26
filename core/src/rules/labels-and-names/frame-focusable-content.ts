import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { isHiddenFrame } from "../landmarks/constants";

// Natively focusable elements that aren't themselves excluded from tab order
const FOCUSABLE_IN_FRAME =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), details > summary:first-of-type, area[href]';

export const frameFocusableContent: Rule = {
  id: "labels-and-names/frame-focusable-content",
  category: "labels-and-names",
  actRuleIds: ["akn7bn"],
  wcag: ["2.1.1"],
  level: "A",
  fixability: "mechanical",
  description: "Iframes with interactive content must not be excluded from the tab order.",
  guidance:
    "An <iframe> with tabindex=\"-1\" removes the frame itself from the tab order, but focusable elements inside remain reachable with arrow keys on some browsers and are unreachable on others. Remove tabindex=\"-1\" from the iframe, or add tabindex=\"-1\" to every focusable element inside it. If the frame is decorative, add aria-hidden=\"true\" instead.",
  run(doc) {
    const violations = [];
    for (const frame of doc.querySelectorAll("iframe")) {
      if (isAriaHidden(frame)) continue;
      if (isHiddenFrame(frame)) continue;
      if (frame.getAttribute("inert") !== null) continue;

      const tabindex = frame.getAttribute("tabindex");
      if (!tabindex || parseInt(tabindex, 10) >= 0) continue;

      // Access same-origin / srcdoc content
      const frameDoc = (frame as HTMLIFrameElement).contentDocument;
      if (!frameDoc) continue;

      // Check for focusable content not itself removed from tab order
      const hasFocusableContent = frameDoc.querySelector(FOCUSABLE_IN_FRAME) !== null;
      if (!hasFocusableContent) continue;

      violations.push({
        ruleId: "labels-and-names/frame-focusable-content",
        selector: getSelector(frame),
        html: getHtmlSnippet(frame),
        impact: "serious" as const,
        message:
          'iframe has tabindex="-1" but contains focusable content, making it unreachable by keyboard.',
        fix: { type: "remove-attribute" as const, attribute: "tabindex" },
      });
    }
    return violations;
  },
};
