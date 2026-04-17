import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const scopeAttrValid: Rule = {
  id: "adaptable/scope-attr-valid",
  category: "adaptable",
  wcag: ["1.3.1"],
  level: "A",
  fixability: "mechanical",
  description: "The scope attribute on table headers must have a valid value.",
  guidance:
    "The scope attribute tells screen readers which cells a header applies to. Valid values are: row, col, rowgroup, colgroup. Using invalid values breaks the association between headers and cells.",
  run(doc) {
    const violations = [];
    const validScopes = new Set(["row", "col", "rowgroup", "colgroup"]);

    for (const th of doc.querySelectorAll("th[scope]")) {
      if (isAriaHidden(th)) continue;

      const scope = th.getAttribute("scope")?.toLowerCase();
      if (scope && !validScopes.has(scope)) {
        violations.push({
          ruleId: "adaptable/scope-attr-valid",
          selector: getSelector(th),
          html: getHtmlSnippet(th),
          impact: "moderate" as const,
          message: `Invalid scope value "${scope}". Use row, col, rowgroup, or colgroup.`,
        });
      }
    }

    return violations;
  },
};
