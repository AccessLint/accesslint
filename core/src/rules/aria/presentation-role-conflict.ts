import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

// Focusable elements selector
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

// Elements that have global ARIA attributes requiring accessible semantics
const GLOBAL_ARIA_ATTRS = [
  "aria-atomic",
  "aria-busy",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-dropeffect",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-keyshortcuts",
  "aria-live",
  "aria-owns",
  "aria-relevant",
];

/**
 * Check an element for attributes/state that conflict with decorative intent.
 */
function getConflictIssues(el: Element): string[] {
  const issues: string[] = [];

  // Check if element is focusable
  if (el.matches(FOCUSABLE_SELECTOR)) {
    issues.push("element is focusable");
  }

  // Check for global ARIA attributes that conflict
  for (const attr of GLOBAL_ARIA_ATTRS) {
    if (el.hasAttribute(attr)) {
      issues.push(`has ${attr}`);
      break; // Report only first conflicting attr
    }
  }

  // Check for aria-label or aria-labelledby (name establishing)
  if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
    issues.push("has accessible name");
  }

  return issues;
}

export const presentationRoleConflict: Rule = {
  id: "aria/presentation-role-conflict",
  category: "aria",
  actRuleIds: ["46ca7f"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description:
    "Elements with role='presentation' or role='none' must not be focusable or have global ARIA attributes.",
  guidance:
    "When an element has role='presentation' or role='none', it's marked as decorative and removed from the accessibility tree. However, if the element is focusable or has certain ARIA attributes, the presentation role is ignored and the element remains accessible. This creates confusion. Either remove the presentation role, or remove the focusability/ARIA attributes.",
  run(doc) {
    const violations = [];

    // Elements with explicit presentation/none role
    for (const el of doc.querySelectorAll('[role="presentation"], [role="none"]')) {
      if (isAriaHidden(el)) continue;

      const issues = getConflictIssues(el);
      if (issues.length > 0) {
        violations.push({
          ruleId: "aria/presentation-role-conflict",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: `Presentation role conflicts with: ${issues.join(", ")}. The role will be ignored.`,
          fix: {
            type: "suggest",
            suggestion:
              "Remove the presentation/none role, or remove the conflicting focusability and ARIA attributes",
          } as const,
        });
      }
    }

    // Elements with implicit presentation role: <img alt="">
    // Per ARIA in HTML, <img alt=""> has implicit role "presentation"
    for (const img of doc.querySelectorAll('img[alt=""]')) {
      if (isAriaHidden(img)) continue;
      // Skip if already has an explicit role (handled above or not decorative)
      if (img.hasAttribute("role")) continue;

      const issues = getConflictIssues(img);
      if (issues.length > 0) {
        violations.push({
          ruleId: "aria/presentation-role-conflict",
          selector: getSelector(img),
          html: getHtmlSnippet(img),
          impact: "serious" as const,
          message: `Element with implicit presentation role (alt="") conflicts with: ${issues.join(", ")}. The decorative role will be ignored.`,
          fix: {
            type: "suggest",
            suggestion:
              "Remove the conflicting focusability and ARIA attributes, or add descriptive alt text if the image is not decorative",
          } as const,
        });
      }
    }

    return violations;
  },
};
