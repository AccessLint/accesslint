import type { Rule, Fixability, FixSuggestion } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isComputedHidden, isInShadowDOM } from "../utils/aria";

export function createNameRule(opts: {
  id: string;
  description: string;
  guidance: string;
  selector: string;
  message: string;
  actRuleIds?: string[];
  fixability?: Fixability;
  roleSet?: Set<string>;
  /** Structured fix suggestion for agents and automated tooling */
  fix?: FixSuggestion;
  /** Skip elements hidden via computed styles (display:none, visibility:hidden, etc.) */
  checkComputedHidden?: boolean;
  /** Skip elements inside shadow DOM (name resolution can't cross shadow boundaries) */
  checkShadowDOM?: boolean;
  /** CSS selector for native elements handled by other rules (e.g. "input, select, textarea") */
  skipNative?: string;
}): Rule {
  return {
    id: opts.id,
    category: opts.id.split("/")[0],
    ...(opts.actRuleIds ? { actRuleIds: opts.actRuleIds } : {}),
    wcag: ["4.1.2"],
    level: "A",
    ...(opts.fixability ? { fixability: opts.fixability } : {}),
    description: opts.description,
    guidance: opts.guidance,
    run(doc) {
      const violations = [];

      for (const el of doc.querySelectorAll(opts.selector)) {
        if (isAriaHidden(el)) continue;
        if (opts.checkComputedHidden && isComputedHidden(el)) continue;
        if (opts.checkShadowDOM && isInShadowDOM(el)) continue;

        // Check if role matches (if roleSet provided)
        if (opts.roleSet) {
          const role = el.getAttribute("role")?.trim().toLowerCase();
          if (!role || !opts.roleSet.has(role)) continue;
        }

        // Skip native elements handled by other rules
        if (opts.skipNative && el.matches(opts.skipNative)) continue;

        const name = getAccessibleName(el);
        if (!name) {
          violations.push({
            ruleId: opts.id,
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "serious" as const,
            message: opts.message,
            ...(opts.fix ? { fix: opts.fix } : {}),
          });
        }
      }

      return violations;
    },
  };
}
