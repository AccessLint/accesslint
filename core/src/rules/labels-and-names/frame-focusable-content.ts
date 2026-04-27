import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { isHiddenFrame } from "../landmarks/constants";

// Natively focusable elements that aren't themselves excluded from tab order.
// The :not([tabindex="-1"]) guards cover ACT inapplicable cases where every
// interactive element inside the frame has been individually excluded.
const FOCUSABLE_IN_FRAME =
  'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), audio[controls]:not([tabindex="-1"]), video[controls]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"]):not([tabindex="-1"]), details > summary:first-of-type:not([tabindex="-1"]), area[href]:not([tabindex="-1"])';

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
  applicable: (doc) => doc.querySelector('iframe[tabindex="-1"]') !== null,
  run(doc) {
    const violations = [];
    // When a modal dialog is open, the browser's focus trap renders everything
    // outside the dialog unreachable. The iframe's tabindex="-1" is irrelevant
    // in that context — the frame is already inaccessible.
    const hasOpenDialog = doc.querySelector("dialog[open]") !== null;
    for (const frame of doc.querySelectorAll("iframe")) {
      if (isAriaHidden(frame)) continue;
      if (isHiddenFrame(frame)) continue;
      if (frame.getAttribute("inert") !== null) continue;
      if (hasOpenDialog && !frame.closest("dialog[open]")) continue;

      const tabindex = frame.getAttribute("tabindex");
      if (!tabindex || parseInt(tabindex, 10) >= 0) continue;

      // Use contentDocument when available (same-origin src= iframes in real browsers).
      // For srcdoc iframes the browser loads content asynchronously, so contentDocument
      // may be empty at rule-run time; fall back to DOMParser on the raw attribute.
      let frameDoc: Document | null = (frame as HTMLIFrameElement).contentDocument;
      const srcdoc = frame.getAttribute("srcdoc");
      if ((!frameDoc || frameDoc.body.innerHTML.trim() === "") && srcdoc) {
        try {
          frameDoc = new DOMParser().parseFromString(srcdoc, "text/html");
        } catch {
          frameDoc = null;
        }
      }
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
