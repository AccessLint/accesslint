import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleTextContent } from "../utils/aria";

export const skipLink: Rule = {
  id: "navigable/skip-link",
  category: "navigable",
  wcag: ["2.4.1"],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "mechanical",
  description: "Skip links must point to a valid target on the page.",
  guidance: "Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content. The skip link should be the first focusable element on the page, link to the main content (e.g., href='#main'), and become visible when focused. It can be visually hidden until focused using CSS.",
  run(doc) {
    const violations = [];

    // Find skip-link candidates: same-page anchor links near the top of the
    // page whose text suggests a "skip to …" purpose.  Only validate that
    // their targets exist — absence of a skip link is covered by the
    // separate "bypass" rule.
    const anchors = doc.querySelectorAll('a[href^="#"]');

    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href || href === "#") continue;

      const text = getAccessibleTextContent(a).toLowerCase();
      const isSkipLink =
        text.includes("skip") || text.includes("jump") ||
        text.includes("main content") || text.includes("navigation");
      if (!isSkipLink) continue;

      // Validate the target exists
      const targetId = href.slice(1);
      const target = doc.getElementById(targetId);
      if (!target) {
        violations.push({
          ruleId: "navigable/skip-link",
          selector: getSelector(a),
          html: getHtmlSnippet(a),
          impact: "moderate" as const,
          message: `Skip link points to "#${targetId}" which does not exist on the page.`,
        });
      }
    }

    return violations;
  },
};
