/**
 * Determine whether a <table> is a data table (as opposed to a layout table).
 * Layout tables should not be checked for header associations.
 */
export function isDataTable(table: Element): boolean {
  const role = table.getAttribute("role");
  if (role === "presentation" || role === "none") return false;
  if (role === "table" || role === "grid" || role === "treegrid") return true;

  // Strong data-table signals
  if (table.querySelector("caption") || table.getAttribute("summary")) return true;
  if (table.querySelector("thead, tfoot, colgroup")) return true;
  if (table.querySelector("th[scope]")) return true;
  if (table.querySelector("td[headers]")) return true;

  // Has th elements with meaningful text content
  const ths = table.querySelectorAll("th");
  if (ths.length === 0) return false;
  for (const th of ths) {
    if (th.textContent?.trim()) return true;
  }

  return false;
}

/**
 * Compute the column index of a cell accounting for preceding colspan values.
 */
export function getColIndex(cell: Element): number {
  let idx = 0;
  let prev = cell.previousElementSibling;
  while (prev) {
    idx += parseInt(prev.getAttribute("colspan") || "1", 10);
    prev = prev.previousElementSibling;
  }
  return idx;
}
