import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, isComputedHidden } from "../utils/aria";

const VALID_PASSWORD_AUTOCOMPLETE = new Set([
  "current-password",
  "new-password",
]);

export const accessibleAuthentication: Rule = {
  id: "input-assistance/accessible-authentication",
  category: "input-assistance",
  wcag: ["3.3.8"],
  level: "AA",
  fixability: "mechanical",
  description:
    "Password inputs must not block password managers. Avoid autocomplete=\"off\" and allow pasting.",
  guidance:
    "WCAG 2.2 SC 3.3.8 requires that authentication steps either avoid cognitive function tests or provide a mechanism to assist users. Password managers are a key assistive mechanism. Setting autocomplete=\"off\" on password fields prevents password managers from filling credentials. Blocking paste via onpaste attributes prevents users from pasting stored passwords. Set autocomplete to \"current-password\" for login forms or \"new-password\" for registration/change-password forms, and do not block paste on password fields.",
  run(doc) {
    const violations = [];

    for (const el of doc.querySelectorAll('input[type="password"]')) {
      if (isAriaHidden(el)) continue;
      if (isComputedHidden(el)) continue;
      if ((el as HTMLInputElement).disabled) continue;
      if (el.getAttribute("aria-disabled") === "true") continue;

      const autocomplete = el.getAttribute("autocomplete")?.trim().toLowerCase();

      if (autocomplete === "off") {
        violations.push({
          ruleId: "input-assistance/accessible-authentication",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "critical" as const,
          message:
            'Password field has autocomplete="off" which blocks password managers.',
          fix: {
            type: "set-attribute",
            attribute: "autocomplete",
            value: "current-password",
          } as const,
        });
        continue;
      }

      // Check for paste-blocking attributes
      const onpaste = el.getAttribute("onpaste");
      if (onpaste && /return\s+false|preventDefault/.test(onpaste)) {
        violations.push({
          ruleId: "input-assistance/accessible-authentication",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "critical" as const,
          message:
            "Password field blocks pasting, preventing password manager use.",
          fix: {
            type: "remove-attribute",
            attribute: "onpaste",
          } as const,
        });
      }
    }

    return violations;
  },
};
