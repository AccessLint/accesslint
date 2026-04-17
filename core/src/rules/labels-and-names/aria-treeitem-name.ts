import type { Rule } from "../types";
import { createNameRule } from "./aria-name-helpers";

export const ariaTreeitemName: Rule = createNameRule({
  id: "labels-and-names/aria-treeitem-name",
  fixability: "contextual",
  description: "ARIA treeitem elements must have an accessible name.",
  guidance:
    "Tree items must have accessible names so screen reader users can understand the tree structure and navigate it effectively. Provide text content, aria-label, or aria-labelledby for each treeitem.",
  selector: '[role="treeitem"]',
  message: "Treeitem has no accessible name.",
  fix: { type: "add-text-content" },
});
