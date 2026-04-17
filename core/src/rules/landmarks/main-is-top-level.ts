import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

export const mainIsTopLevel: Rule = {
  id: "landmarks/main-is-top-level",
  category: "landmarks",
  wcag: [],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "contextual",
  description: "Main landmark should not be nested within another landmark.",
  guidance:
    "Screen readers provide a shortcut to jump directly to the main landmark. When <main> is nested inside another landmark (article, aside, nav, or section), some screen readers may not list it as a top-level landmark, making it harder to find. Move <main> outside any sectioning elements so it sits at the top level of the document.",
  run(doc) {
    const violations: Violation[] = [];
    const mains = doc.querySelectorAll('main, [role="main"]');

    for (const main of mains) {
      // Check if nested in other landmarks (not just sectioning elements, but other landmarks)
      const parent = main.parentElement;
      if (
        parent?.closest(
          'article, aside, nav, section[aria-label], section[aria-labelledby], [role="article"], [role="complementary"], [role="navigation"], [role="region"]',
        )
      ) {
        violations.push({
          ruleId: "landmarks/main-is-top-level",
          selector: getSelector(main),
          html: getHtmlSnippet(main),
          impact: "moderate" as const,
          message: "Main landmark is nested within another landmark.",
        });
      }
    }
    return violations;
  },
};
