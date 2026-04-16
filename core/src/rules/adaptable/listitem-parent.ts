import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const listitemParent: Rule = {
  id: "adaptable/listitem-parent",
  category: "adaptable",
  wcag: ["1.3.1"],
  level: "A",
  fixability: "contextual",
  description: "<li> elements must be contained in a <ul>, <ol>, or <menu>.",
  guidance:
    "List items (<li>) only have semantic meaning inside a list container (<ul>, <ol>, or <menu>). Without a list parent, screen readers will not announce 'list with N items' or allow users to skip between items using list navigation shortcuts. Wrap <li> elements in the appropriate list container — <ul> for unordered lists, <ol> for ordered/numbered lists.",
  run(doc) {
    const violations = [];
    for (const el of doc.querySelectorAll("li")) {
      if (isAriaHidden(el)) continue;
      const parent = el.parentElement;
      if (!parent) continue;
      const parentTag = parent.tagName.toLowerCase();
      // Valid parents: ul, ol, menu (native), or any element with role="list"
      if (parentTag === "ul" || parentTag === "ol" || parentTag === "menu") continue;
      const parentRole = parent.getAttribute("role")?.trim().toLowerCase();
      if (parentRole === "list") continue;
      violations.push({
        ruleId: "adaptable/listitem-parent",
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "serious" as const,
        message: `<li> is not contained in a <ul>, <ol>, or <menu>.`,
      });
    }
    return violations;
  },
};
