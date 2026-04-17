import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, FOCUSABLE_SELECTOR } from "../utils/aria";
import { getCachedComputedStyle } from "../utils/color";

export const scrollableRegion: Rule = {
  id: "keyboard-accessible/scrollable-region",
  category: "keyboard-accessible",
  actRuleIds: ["0ssw9k"],
  wcag: ["2.1.1"],
  level: "A",
  fixability: "contextual",
  browserHint: "Tab to the scrollable region and verify keyboard scrolling works with arrow keys.",
  description: "Scrollable regions must be keyboard accessible.",
  guidance: "Content that scrolls must be accessible to keyboard users. If a region has overflow:scroll or overflow:auto and contains scrollable content, it needs either tabindex='0' to be focusable, or it must contain focusable elements. Without this, keyboard users cannot scroll the content.",
  run(doc) {
    const violations = [];

    for (const el of doc.querySelectorAll("*")) {
      if (isAriaHidden(el)) continue;
      if (!(el instanceof HTMLElement)) continue;

      // Skip <body> and <html> — inherently scrollable via browser
      const tagName = el.tagName.toLowerCase();
      if (tagName === "body" || tagName === "html") continue;

      // Skip role="presentation" / role="none" — decorative containers
      const role = el.getAttribute("role");
      if (role === "presentation" || role === "none") continue;

      // Skip widget containers that manage their own keyboard interaction
      if (role === "listbox" || role === "menu" || role === "tree" || role === "tabpanel") continue;

      // Check if element is scrollable
      const style = getCachedComputedStyle(el);

      const overflowX = style.overflowX;
      const overflowY = style.overflowY;
      const isScrollable = (overflowX === "scroll" || overflowX === "auto" ||
                           overflowY === "scroll" || overflowY === "auto");

      if (!isScrollable) continue;

      // Check if it actually has scrollable content.
      // In real browsers, scroll metrics reflect actual layout overflow.
      // In DOM-only environments (happy-dom / jsdom) there is no layout engine,
      // so scrollHeight === clientHeight === 0 and we skip these elements.
      const hasScrollMetrics = el.scrollHeight > 0 || el.clientHeight > 0;
      if (hasScrollMetrics) {
        const overflowH = el.scrollHeight - el.clientHeight;
        const overflowW = el.scrollWidth - el.clientWidth;
        // No overflow at all
        if (overflowH <= 0 && overflowW <= 0) continue;
        // Require meaningful overflow — small overflows (< 14px) are often
        // caused by borders, padding, or sub-pixel rounding, not real content.
        if (overflowH < 14 && overflowW < 14) continue;
        // Skip elements under 64x64px — too small to be meaningful scroll regions
        if (el.clientWidth < 64 && el.clientHeight < 64) continue;
        // Skip scrollable regions with no meaningful content
        // (e.g. decorative scrollbar illustrations with only spacer elements)
        const textLen = el.textContent?.trim().length ?? 0;
        const hasMedia = el.querySelector("img, svg, video, canvas, picture") !== null;
        if (textLen === 0 && !hasMedia) continue;
      } else {
        continue;
      }

      // Check if it's focusable
      const tabindex = el.getAttribute("tabindex");
      if (tabindex !== null && tabindex !== "-1") continue;

      // Check if it contains focusable elements
      const focusableChild = el.querySelector(FOCUSABLE_SELECTOR);
      if (focusableChild) continue;

      violations.push({
        ruleId: "keyboard-accessible/scrollable-region",
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "serious" as const,
        message: "Scrollable region is not keyboard accessible. Add tabindex='0' or include focusable elements.",
      });
    }

    return violations;
  },
};
