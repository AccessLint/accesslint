import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const tdHeadersAttr: Rule = {
  id: "adaptable/td-headers-attr",
  category: "adaptable",
  actRuleIds: ["a25f45"],
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  description: "All cells in a table using headers attribute must reference valid header IDs.",
  guidance:
    "The headers attribute on table cells must reference IDs of header cells (th or td) within the same table. This creates explicit associations for screen readers. Verify all referenced IDs exist and spell them correctly. For simple tables, consider using scope on th elements instead.",
  applicable: (doc) => doc.querySelector("td[headers], th[headers]") !== null,
  run(doc) {
    const violations = [];
    for (const td of doc.querySelectorAll("td[headers]")) {
      if (isAriaHidden(td)) continue;
      const table = td.closest("table");
      if (!table) continue;
      const tdId = td.getAttribute("id");
      const ids = td.getAttribute("headers")!.split(/\s+/);
      for (const id of ids) {
        // Self-referencing headers are invalid
        if (id === tdId) {
          violations.push({
            ruleId: "adaptable/td-headers-attr",
            selector: getSelector(td),
            html: getHtmlSnippet(td),
            impact: "serious" as const,
            message: `Headers attribute references the cell itself ("${id}").`,
          });
          break;
        }
        if (!table.querySelector(`th#${CSS.escape(id)}, td#${CSS.escape(id)}`)) {
          violations.push({
            ruleId: "adaptable/td-headers-attr",
            selector: getSelector(td),
            html: getHtmlSnippet(td),
            impact: "serious" as const,
            message: `Headers attribute references non-existent ID "${id}".`,
          });
          break;
        }
      }
    }
    return violations;
  },
};
