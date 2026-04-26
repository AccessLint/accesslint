import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isComputedHidden, isInShadowDOM } from "../utils/aria";

function getButtonContext(btn: Element): string | undefined {
  const parts: string[] = [];

  // Include class names (helpful for icon buttons like "btn-close", "icon-search")
  const className = btn.className;
  if (className && typeof className === "string" && className.trim()) {
    parts.push(`Classes: ${className.trim().slice(0, 100)}`);
  }

  // Check for form context
  const form = btn.closest("form");
  if (form) {
    const formLabel =
      form.getAttribute("aria-label") || form.querySelector("legend")?.textContent?.trim();
    if (formLabel) parts.push(`Form: ${formLabel.slice(0, 60)}`);
  }

  // Check nearby heading
  const parent = btn.parentElement;
  if (parent) {
    const heading =
      parent.closest("h1, h2, h3, h4, h5, h6") || parent.querySelector("h1, h2, h3, h4, h5, h6");
    if (heading?.textContent?.trim()) {
      parts.push(`Nearby heading: ${heading.textContent.trim().slice(0, 60)}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export const buttonName: Rule = {
  id: "labels-and-names/button-name",
  category: "labels-and-names",
  actRuleIds: ["97a4e1"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the button to identify its icon or visual label, then add a matching aria-label.",
  description: "Buttons must have discernible text.",
  guidance:
    "Screen reader users need to know what a button does. Add visible text content, aria-label, or aria-labelledby. For icon buttons, use aria-label describing the action (e.g., aria-label='Close'). If the button contains an image, ensure the image has alt text describing the button's action.",
  applicable: (doc) =>
    doc.querySelector(
      'button, [role="button"]:not(input[type="image"]), input[type="button"], input[type="submit"], input[type="reset"]',
    ) !== null,
  run(doc) {
    const violations = [];
    for (const btn of doc.querySelectorAll('button, [role="button"]')) {
      if (isAriaHidden(btn)) continue;
      if (isComputedHidden(btn)) continue;

      // Presentation role is only respected when element is NOT focusable.
      // Focusable elements (like <button>) override the presentation role.
      const role = btn.getAttribute("role");
      if (role === "none" || role === "presentation") {
        const isFocusable =
          btn.matches('button:not([disabled]), [tabindex]:not([tabindex="-1"])') ||
          (btn.tagName.toLowerCase() === "button" && !(btn as HTMLButtonElement).disabled);
        if (!isFocusable) continue;
      }

      // Skip elements inside shadow DOM — accessible name resolution
      // can't reliably cross shadow boundaries (aria-labelledby IDs,
      // slot content, etc.), leading to false positives.
      if (isInShadowDOM(btn)) continue;

      const name = getAccessibleName(btn);
      if (!name) {
        violations.push({
          ruleId: "labels-and-names/button-name",
          selector: getSelector(btn),
          html: getHtmlSnippet(btn),
          impact: "critical" as const,
          message: "Button has no discernible text.",
          context: getButtonContext(btn),
          fix: { type: "add-text-content" } as const,
        });
      }
    }
    return violations;
  },
};
