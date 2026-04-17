import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const thHasDataCells: Rule = {
  id: "adaptable/th-has-data-cells",
  category: "adaptable",
  actRuleIds: ["d0f69e"],
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  description: "Table headers should be associated with data cells.",
  guidance:
    "Screen readers use <th> elements to announce column or row headers when navigating table cells — for example, reading 'Name: John' when moving to a cell. A table with <th> but no <td> elements means headers describe nothing, and screen readers cannot associate data with headers. Either add <td> data cells, or if this is not tabular data, use non-table markup instead.",
  run(doc) {
    const violations = [];
    for (const table of doc.querySelectorAll("table")) {
      if (isAriaHidden(table)) continue;
      // Skip tables marked as presentational
      if (table.getAttribute("role") === "presentation" || table.getAttribute("role") === "none")
        continue;

      const ths = table.querySelectorAll("th");
      const tds = table.querySelectorAll("td");
      if (ths.length > 0 && tds.length === 0) {
        violations.push({
          ruleId: "adaptable/th-has-data-cells",
          selector: getSelector(table),
          html: getHtmlSnippet(table),
          impact: "serious" as const,
          message: "Table has header cells but no data cells.",
        });
      }
    }
    return violations;
  },
};
