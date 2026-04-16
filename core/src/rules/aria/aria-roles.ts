import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isValidRole } from "../utils/aria";

export const ariaRoles: Rule = {
  id: "aria/aria-roles",
  category: "aria",
  actRuleIds: ["674b10"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "ARIA role values must be valid.",
  guidance:
    "Invalid role values are ignored by assistive technologies, meaning the element will not have the intended semantics. Check the spelling and use only roles defined in the WAI-ARIA specification. Common roles include: button, link, navigation, main, dialog, alert, tab, tabpanel, menu, menuitem.",
  run(doc) {
    const violations = [];
    for (const el of doc.querySelectorAll("[role]")) {
      const rawRole = el.getAttribute("role")!;
      // Strip Unicode curly quotes before splitting
      const cleaned = rawRole.replace(/[\u201C\u201D\u2018\u2019\u00AB\u00BB]/g, "");
      const roles = cleaned.split(/\s+/).filter(Boolean);
      // Per ARIA spec, user agents use the first valid role in the list as
      // a fallback chain.  Only report a violation when NONE of the listed
      // roles is valid.
      const hasValidRole = roles.some((r) => isValidRole(r));
      if (!hasValidRole && roles.length > 0) {
        violations.push({
          ruleId: "aria/aria-roles",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "critical" as const,
          message: `Invalid ARIA role "${roles[0]}".`,
          fix: { type: "remove-attribute", attribute: "role" } as const,
        });
      }
    }
    return violations;
  },
};
