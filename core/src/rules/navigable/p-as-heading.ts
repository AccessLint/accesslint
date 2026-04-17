import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const pAsHeading: Rule = {
  id: "navigable/p-as-heading",
  category: "navigable",
  wcag: ["1.3.1"],
  level: "A",
  tags: ["best-practice"],
  fixability: "contextual",
  browserHint:
    "Screenshot the page to verify the paragraph visually functions as a heading and choose the correct heading level.",
  description: "Paragraphs should not be styled to look like headings.",
  guidance:
    "When paragraphs are styled with bold, large fonts to look like headings, screen reader users miss the semantic structure. Use proper heading elements (h1-h6) instead of styled paragraphs. If you need specific styling, apply CSS to the heading elements while maintaining proper heading hierarchy.",
  run(doc) {
    const violations = [];

    for (const p of doc.querySelectorAll("p")) {
      if (isAriaHidden(p)) continue;

      // Check for inline styles suggesting heading use
      const style = p.getAttribute("style") || "";
      const hasBoldStyle = /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
      const hasLargeFont = /font-size\s*:\s*(\d+)\s*(px|em|rem)/i.test(style);

      // Check for classes suggesting heading — require word-boundary matches
      // to avoid false positives on "subtitle", "content-header-wrapper", etc.
      const className = p.className?.toLowerCase() || "";
      const hasHeadingClass = /\bh[1-6]\b|\bheading\b/.test(className);

      // Check for very short text that might be a heading
      const text = p.textContent?.trim() || "";
      const isShort = text.length > 0 && text.length < 50;
      const hasNoPunctuation = !text.match(/[.!?,;:]$/);

      // Require strong evidence: bold+large inline style, or bold+heading class
      const hasStrongStyleSignal = hasBoldStyle && hasLargeFont;
      const hasStrongClassSignal = hasBoldStyle && hasHeadingClass;

      if ((hasStrongStyleSignal || hasStrongClassSignal) && isShort && hasNoPunctuation) {
        // Check if there's substantial content following this paragraph
        const nextSibling = p.nextElementSibling;
        if (
          nextSibling &&
          (nextSibling.tagName === "P" ||
            nextSibling.tagName === "DIV" ||
            nextSibling.tagName === "UL")
        ) {
          violations.push({
            ruleId: "navigable/p-as-heading",
            selector: getSelector(p),
            html: getHtmlSnippet(p),
            impact: "serious" as const,
            message: "Paragraph appears to be styled as a heading. Use an h1-h6 element instead.",
            fix: {
              type: "suggest",
              suggestion:
                "Replace the <p> element with the appropriate heading level (h1-h6) based on the document outline. Preserve the text content and move any inline styles to a CSS class on the new heading element.",
            } as const,
          });
        }
      }
    }

    return violations;
  },
};
