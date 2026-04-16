import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

const NON_INTERACTIVE_TAGS = new Set([
  "div", "span", "p", "section", "article", "header", "footer", "main",
  "nav", "aside", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
  "dl", "dt", "dd", "table", "tr", "td", "th",
]);

export const focusOrder: Rule = {
  id: "keyboard-accessible/focus-order",
  category: "keyboard-accessible",
  wcag: [],
  tags: ["best-practice"],
  level: "A",
  fixability: "contextual",
  description:
    "Non-interactive elements with tabindex='0' must have an interactive ARIA role so assistive technologies can convey their purpose.",
  guidance:
    "When adding tabindex='0' to non-interactive elements like <div> or <span>, screen readers announce them generically. Add an appropriate role (button, link, tab, etc.) so users understand the element's purpose. Also add keyboard event handlers (Enter/Space for buttons, Enter for links). Consider using native interactive elements instead.",
  run(doc) {
    const violations = [];
    for (const el of doc.querySelectorAll('[tabindex="0"]')) {
      const tag = el.tagName.toLowerCase();
      if (!NON_INTERACTIVE_TAGS.has(tag)) continue;
      const role = el.getAttribute("role");
      if (!role) {
        violations.push({
          ruleId: "keyboard-accessible/focus-order",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "moderate" as const,
          message: `Non-interactive <${tag}> with tabindex="0" has no interactive role.`,
        });
      }
    }
    return violations;
  },
};
