import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getComputedRole } from "../utils/aria";

// Role to required parent role mapping
const REQUIRED_PARENT: Record<string, string[]> = {
  caption: ["figure", "table", "grid", "treegrid"],
  cell: ["row"],
  columnheader: ["row"],
  gridcell: ["row"],
  listitem: ["list", "group"],
  menuitem: ["menu", "menubar", "group"],
  menuitemcheckbox: ["menu", "menubar", "group"],
  menuitemradio: ["menu", "menubar", "group"],
  option: ["listbox", "group"],
  row: ["table", "grid", "treegrid", "rowgroup"],
  rowgroup: ["table", "grid", "treegrid"],
  rowheader: ["row"],
  tab: ["tablist"],
  treeitem: ["tree", "group"],
};

export const ariaRequiredParent: Rule = {
  id: "adaptable/aria-required-parent",
  category: "adaptable",
  actRuleIds: ["ff89c9"],
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  description: "Certain ARIA roles must be contained within specific parent roles.",
  guidance:
    "Some ARIA roles represent items that must exist within specific container roles. For example, a listitem must be within a list, a tab must be within a tablist. Wrap the element in the appropriate parent, or use native HTML elements that provide this structure (e.g., <li> inside <ul>).",
  run(doc) {
    const violations: Violation[] = [];

    for (const el of doc.querySelectorAll("[role]")) {
      if (isAriaHidden(el)) continue;

      const role = el.getAttribute("role")?.trim().toLowerCase();
      if (!role || !(role in REQUIRED_PARENT)) continue;

      const required = REQUIRED_PARENT[role];

      // Walk up the DOM to find a required parent
      let current = el.parentElement;
      let found = false;

      while (current && current !== doc.documentElement) {
        const parentRole = getComputedRole(current);

        if (parentRole && required.includes(parentRole)) {
          found = true;
          break;
        }
        current = current.parentElement;
      }

      if (!found) {
        violations.push({
          ruleId: "adaptable/aria-required-parent",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "critical" as const,
          message: `Role "${role}" must be contained within: ${required.join(", ")}.`,
        });
      }
    }

    return violations;
  },
};
