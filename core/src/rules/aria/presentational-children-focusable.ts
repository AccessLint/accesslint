import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getComputedRole, FOCUSABLE_SELECTOR } from "../utils/aria";

/**
 * Roles with the "children presentational" trait per ARIA 1.2.
 * Children of these elements are presentational (removed from a11y tree),
 * so they must not contain focusable content.
 */
const CHILDREN_PRESENTATIONAL_ROLES = new Set([
  "button",
  "checkbox",
  "img",
  "link",
  "math",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "option",
  "progressbar",
  "radio",
  "scrollbar",
  "separator",
  "slider",
  "spinbutton",
  "switch",
  "tab",
]);

export const presentationalChildrenFocusable: Rule = {
  id: "aria/presentational-children-focusable",
  category: "aria",
  actRuleIds: ["307n5z"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description:
    "Elements with a role that makes children presentational must not contain focusable content.",
  guidance:
    "Roles like button, checkbox, img, tab, and others make their children presentational — hidden from assistive technologies. If those children are focusable, keyboard users can reach elements that screen reader users cannot perceive. Move focusable content outside the parent or remove the focusability.",
  run(doc) {
    const violations = [];

    for (const el of doc.querySelectorAll("*")) {
      if (isAriaHidden(el)) continue;

      const role = getComputedRole(el);
      if (!role || !CHILDREN_PRESENTATIONAL_ROLES.has(role)) continue;

      // Check for focusable descendants
      for (const child of el.querySelectorAll(FOCUSABLE_SELECTOR)) {
        // Skip the element itself (it's expected to be focusable)
        if (child === el) continue;
        // Skip disabled elements
        if ((child as HTMLButtonElement | HTMLInputElement).disabled) continue;
        // Skip elements with tabindex="-1" — they are not keyboard-focusable
        // (they can receive programmatic focus, but are not reachable via Tab)
        if (child.getAttribute("tabindex") === "-1") continue;

        violations.push({
          ruleId: "aria/presentational-children-focusable",
          selector: getSelector(child),
          html: getHtmlSnippet(child),
          impact: "serious" as const,
          message: `Focusable element inside a "${role}" role whose children are presentational.`,
        });
        break; // one violation per parent
      }
    }

    return violations;
  },
};
