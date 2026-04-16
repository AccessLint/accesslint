import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

export const complementaryIsTopLevel: Rule = {
  id: "landmarks/complementary-is-top-level",
  category: "landmarks",
  wcag: [],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "contextual",
  description: "Aside (complementary) landmark should be top-level or directly inside main.",
  guidance: "The complementary landmark (aside) should be top-level or a direct child of main. Nesting aside deep within other landmarks reduces its discoverability for screen reader users navigating by landmarks.",
  run(doc) {
    const violations: Violation[] = [];
    const asides = doc.querySelectorAll('aside, [role="complementary"]');

    for (const aside of asides) {
      // Allowed: top-level or direct child of main
      const parent = aside.parentElement;
      if (parent && !parent.matches('body, main, [role="main"]')) {
        // Check if nested in other sectioning elements
        if (aside.closest('article, nav, section[aria-label], section[aria-labelledby], [role="article"], [role="navigation"], [role="region"]')) {
          violations.push({
            ruleId: "landmarks/complementary-is-top-level",
            selector: getSelector(aside),
            html: getHtmlSnippet(aside),
            impact: "moderate" as const,
            message: "Complementary landmark should be top-level.",
          });
        }
      }
    }
    return violations;
  },
};
