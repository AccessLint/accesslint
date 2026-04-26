import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import {
  getAccessibleName,
  getAccessibleTextContent,
  isAriaHidden,
  isComputedHidden,
} from "../utils/aria";
import { NATIVE_LABELABLE_SELECTOR, getAssociatedLabelText } from "./form-constants";

// Widget roles that constitute form fields (per ACT rule e086e5)
const WIDGET_ROLE_SELECTOR = [
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="radio"]',
  '[role="searchbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="textbox"]',
].join(", ");

// Widget roles where text content is a valid accessible name ("name from content")
const NAME_FROM_CONTENT_ROLES = new Set([
  "checkbox",
  "menuitemcheckbox",
  "menuitemradio",
  "radio",
  "switch",
]);

// Roles where text content is NOT a valid accessible name ("name from author")
const NAME_FROM_AUTHOR_ROLES = new Set([
  "combobox",
  "listbox",
  "searchbox",
  "slider",
  "spinbutton",
  "textbox",
]);

/**
 * Get accessible name for form fields, respecting "name from content" vs
 * "name from author" per the ARIA spec.  For "name from author" roles
 * (textbox, combobox, etc.) and native <select>, text content is NOT a
 * valid accessible name source.
 */
function getFormFieldName(el: Element): string {
  const role = el.getAttribute("role")?.trim().toLowerCase();

  // "Name from content" widget roles: full computation is fine
  if (role && NAME_FROM_CONTENT_ROLES.has(role)) {
    return getAccessibleName(el);
  }

  // Native input/textarea without a "name from author" role override:
  // standard computation already excludes text content for inputs
  const isNativeInput = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  if (isNativeInput && !(role && NAME_FROM_AUTHOR_ROLES.has(role))) {
    return getAccessibleName(el);
  }

  // "Name from author" roles and native <select>: compute without text content
  // 1. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const names = labelledBy
      .split(/\s+/)
      .map((id) => {
        const ref = el.ownerDocument.getElementById(id);
        return ref ? getAccessibleTextContent(ref).trim() : "";
      })
      .filter(Boolean);
    if (names.length) return names.join(" ");
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  // 3. <label> association (only for native labelable elements)
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  ) {
    const labelText = getAssociatedLabelText(el);
    if (labelText) return labelText;
  }

  // 4. title
  const title = el.getAttribute("title")?.trim();
  if (title) return title;

  // 5. placeholder (native input/textarea only)
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const placeholder = el.getAttribute("placeholder")?.trim();
    if (placeholder) return placeholder;
  }

  return "";
}

export const formLabel: Rule = {
  id: "labels-and-names/form-label",
  category: "labels-and-names",
  actRuleIds: ["e086e5"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the form to see visual label placement relative to the input, then associate them with a label element or aria-labelledby.",
  description: "Form elements must have labels. Use <label>, aria-label, or aria-labelledby.",
  guidance:
    "Every form input needs an accessible label so users understand what information to enter. Use a <label> element with a for attribute matching the input's id, wrap the input in a <label>, or use aria-label/aria-labelledby for custom components. Placeholders are not sufficient as labels since they disappear when typing. Labels should describe the information requested, not the field type (e.g., 'Email address', 'Search', 'Phone number').",
  applicable: (doc) =>
    Array.from(
      doc.querySelectorAll('input:not([type="hidden"]), select, textarea'),
    ).some((el) => (el as HTMLElement).style?.display !== "none"),
  run(doc) {
    const violations = [];

    const inputs = doc.querySelectorAll(`${NATIVE_LABELABLE_SELECTOR}, ${WIDGET_ROLE_SELECTOR}`);

    for (const input of inputs) {
      if (isAriaHidden(input)) continue;
      if (isComputedHidden(input)) continue;

      // Skip elements with presentation/none role
      const role = input.getAttribute("role")?.trim().toLowerCase();
      if (role === "presentation" || role === "none") continue;

      const name = getFormFieldName(input);
      if (!name) {
        const parts: string[] = [];
        const tag = input.tagName.toLowerCase();
        const type = input.getAttribute("type");
        if (type && tag === "input") parts.push(`type: ${type}`);
        const inputName = input.getAttribute("name");
        if (inputName) parts.push(`name: "${inputName}"`);
        const placeholder = input.getAttribute("placeholder");
        if (placeholder) parts.push(`placeholder: "${placeholder}"`);
        if (role) parts.push(`role: ${role}`);
        const id = input.getAttribute("id");
        if (id) parts.push(`id: "${id}"`);

        violations.push({
          ruleId: "labels-and-names/form-label",
          selector: getSelector(input),
          html: getHtmlSnippet(input),
          impact: "critical" as const,
          message: "Form element has no accessible label.",
          context: parts.length > 0 ? parts.join(", ") : undefined,
          fix: {
            type: "suggest",
            suggestion:
              "Add a <label> element associated via the for attribute, or add an aria-label attribute",
          } as const,
        });
      }
    }
    return violations;
  },
};
