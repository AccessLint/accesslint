import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden } from "../utils/aria";

export const landmarkUnique: Rule = {
  id: "landmarks/landmark-unique",
  category: "landmarks",
  wcag: [],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "contextual",
  description: "Landmarks should have unique labels when there are multiple of the same type.",
  guidance: "When a page has multiple landmarks of the same type (e.g., multiple nav elements), each should have a unique accessible name via aria-label or aria-labelledby. This helps screen reader users distinguish between them (e.g., 'Main navigation' vs 'Footer navigation').",
  run(doc) {
    const violations: Violation[] = [];
    const landmarkTypes = [
      { selector: 'nav, [role="navigation"]', type: "navigation" },
      { selector: 'aside, [role="complementary"]', type: "complementary" },
      { selector: 'section[aria-label], section[aria-labelledby], [role="region"]', type: "region" },
      { selector: 'form[aria-label], form[aria-labelledby], [role="form"], [role="search"]', type: "form" },
    ];

    for (const { selector, type } of landmarkTypes) {
      const landmarks = Array.from(doc.querySelectorAll(selector)).filter((el) => !isAriaHidden(el));
      if (landmarks.length <= 1) continue;

      const names = new Map<string, Element[]>();
      for (const landmark of landmarks) {
        const name = getAccessibleName(landmark).toLowerCase() || "";
        const existing = names.get(name) || [];
        existing.push(landmark);
        names.set(name, existing);
      }

      for (const [name, elements] of names) {
        if (elements.length > 1) {
          // All elements with duplicate (or empty) names are violations
          for (const el of elements.slice(1)) {
            violations.push({
              ruleId: "landmarks/landmark-unique",
              selector: getSelector(el),
              html: getHtmlSnippet(el),
              impact: "moderate" as const,
              message: name
                ? `Multiple ${type} landmarks have the same label "${name}".`
                : `Multiple ${type} landmarks have no label. Add unique aria-label attributes.`,
            });
          }
        }
      }
    }
    return violations;
  },
};
