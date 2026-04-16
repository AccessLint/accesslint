import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isComputedHidden, isInShadowDOM } from "../utils/aria";

export const ariaCommandName: Rule = {
  id: "labels-and-names/aria-command-name",
  category: "labels-and-names",
  actRuleIds: ["m6b1q3"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "ARIA commands must have an accessible name.",
  guidance: "Interactive ARIA command roles (button, link, menuitem) must have accessible names so users know what action they perform. Add visible text content, aria-label, or aria-labelledby to provide a name.",
  run(doc) {
    const violations = [];

    // Check elements with command roles
    for (const el of doc.querySelectorAll('[role="button"], [role="link"], [role="menuitem"]')) {
      if (isAriaHidden(el)) continue;
      if (isComputedHidden(el)) continue;
      // Skip shadow DOM elements — name resolution can't reliably cross shadow boundaries
      if (isInShadowDOM(el)) continue;

      // Skip native elements handled by other rules, UNLESS the explicit
      // role is menuitem (ACT m6b1q3 — a <button role="menuitem"> is a
      // command that this rule must check).
      const explicitRole = el.getAttribute("role");
      if (
        (el.tagName.toLowerCase() === "button" || el.tagName.toLowerCase() === "a") &&
        explicitRole !== "menuitem"
      ) continue;

      const name = getAccessibleName(el);
      if (!name) {
        // Check for img alt inside
        const img = el.querySelector("img[alt]");
        if (img?.getAttribute("alt")?.trim()) continue;

        violations.push({
          ruleId: "labels-and-names/aria-command-name",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: "ARIA command has no accessible name.",
          fix: { type: "add-attribute", attribute: "aria-label", value: "" } as const,
        });
      }
    }

    return violations;
  },
};
