import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const headingOrder: Rule = {
  id: "navigable/heading-order",
  category: "navigable",
  wcag: [],
  level: "A",
  tags: ["best-practice"],
  fixability: "contextual",
  browserHint:
    "Screenshot the page to see the visual hierarchy, then take an accessibility tree snapshot to map heading levels to visual sections.",
  description:
    "Heading levels should increase by one; skipping levels (e.g. h2 to h4) makes navigation harder.",
  guidance:
    "Screen reader users navigate by headings to understand page structure. Skipping levels (h2 to h4) suggests missing content and creates confusion. Start with h1 for the page title, then use h2 for main sections, h3 for subsections, etc. You can go back up (h3 to h2) when starting a new section.",
  run(doc) {
    const violations = [];
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']");
    let lastLevel = 0;
    let lastHeading: Element | null = null;
    for (const heading of headings) {
      if (isAriaHidden(heading)) continue;
      let level: number;
      if (heading.hasAttribute("aria-level")) {
        level = parseInt(heading.getAttribute("aria-level")!, 10);
      } else {
        level = parseInt(heading.tagName[1], 10);
      }
      if (lastLevel > 0 && level > lastLevel + 1) {
        violations.push({
          ruleId: "navigable/heading-order",
          selector: getSelector(heading),
          html: getHtmlSnippet(heading),
          impact: "moderate" as const,
          message: `Heading level ${level} skipped from level ${lastLevel}. Use h${lastLevel + 1} instead.`,
          context: lastHeading ? `Previous heading: ${getHtmlSnippet(lastHeading)}` : undefined,
          fix: {
            type: "suggest" as const,
            suggestion: `Change this heading to an h${lastLevel + 1} element to maintain proper heading hierarchy`,
          },
        });
      }
      lastLevel = level;
      lastHeading = heading;
    }
    return violations;
  },
};
