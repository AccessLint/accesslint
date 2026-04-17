import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { isDataTable, getColIndex } from "./table-utils";

export const tdHasHeader: Rule = {
  id: "adaptable/td-has-header",
  category: "adaptable",
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the table to understand its visual layout, then add scope or headers attributes to associate data cells with headers.",
  description: "Data cells in tables larger than 3x3 should have associated headers.",
  guidance:
    "In complex tables, screen reader users need header associations to understand data cells. Use th elements with scope attribute, or the headers attribute on td elements. For simple tables (≤3x3), this is less critical as context is usually clear.",
  run(doc) {
    const violations = [];

    for (const table of doc.querySelectorAll("table")) {
      if (isAriaHidden(table)) continue;
      if (!isDataTable(table)) continue;

      // Count rows and columns
      const rows = table.querySelectorAll("tr");
      const rowCount = rows.length;
      let maxCols = 0;
      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        let colCount = 0;
        for (const cell of cells) {
          colCount += parseInt(cell.getAttribute("colspan") || "1", 10);
        }
        maxCols = Math.max(maxCols, colCount);
      }

      // Skip small tables (3x3 or smaller)
      if (rowCount <= 3 && maxCols <= 3) continue;

      const hasScope = table.querySelector("th[scope]") !== null;
      const hasHeadersAttr = table.querySelector("td[headers]") !== null;

      // Check each data cell
      for (const td of table.querySelectorAll("td")) {
        if (isAriaHidden(td)) continue;

        // Skip empty cells — no content to associate
        if (!td.textContent?.trim() && !td.querySelector("img, svg, input, select, textarea"))
          continue;

        // Skip cells with their own accessible name
        if (td.hasAttribute("aria-label") || td.hasAttribute("aria-labelledby")) continue;

        // If cell has headers attribute, it's associated
        if (td.hasAttribute("headers")) continue;

        // Check if there's a th in same row or column
        const row = td.closest("tr");
        if (!row) continue;

        // Check for row header in same row
        const rowHasHeader = row.querySelector("th") !== null;

        // Check for column header (colspan-aware)
        const colIdx = getColIndex(td);
        let colHasHeader = false;

        // Look for th in thead or first row at the same column position
        const thead = table.querySelector("thead");
        const headerRow = thead?.querySelector("tr") ?? table.querySelector("tbody > tr, tr");
        if (headerRow) {
          for (const cell of headerRow.querySelectorAll("th, td")) {
            const ci = getColIndex(cell);
            const span = parseInt(cell.getAttribute("colspan") || "1", 10);
            if (cell.tagName.toLowerCase() === "th" && colIdx >= ci && colIdx < ci + span) {
              colHasHeader = true;
              break;
            }
          }
        }

        if (!rowHasHeader && !colHasHeader && !hasScope && !hasHeadersAttr) {
          violations.push({
            ruleId: "adaptable/td-has-header",
            selector: getSelector(td),
            html: getHtmlSnippet(td),
            impact: "serious" as const,
            message:
              "Data cell has no associated header. Add th elements with scope, or headers attribute.",
          });
          // Only report first cell per table to avoid noise
          break;
        }
      }
    }

    return violations;
  },
};
