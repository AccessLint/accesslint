import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden } from "../utils/aria";

export const summaryName: Rule = {
  id: "labels-and-names/summary-name",
  category: "labels-and-names",
  actRuleIds: ["2t702h"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "<summary> elements must have an accessible name.",
  guidance:
    "The <summary> element provides the visible label for a <details> disclosure widget. It must have descriptive text content so screen reader users understand what will be revealed when expanded. Add clear, concise text that indicates what content is contained in the details section.",
  run(doc) {
    const violations = [];

    for (const summary of doc.querySelectorAll("details > summary:first-of-type")) {
      if (isAriaHidden(summary)) continue;

      const name = getAccessibleName(summary);
      if (!name) {
        violations.push({
          ruleId: "labels-and-names/summary-name",
          selector: getSelector(summary),
          html: getHtmlSnippet(summary),
          impact: "serious" as const,
          message: "<summary> element has no accessible name. Add descriptive text.",
          fix: { type: "add-text-content" } as const,
        });
      }
    }

    return violations;
  },
};
