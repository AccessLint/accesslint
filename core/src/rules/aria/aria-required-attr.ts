import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

const REQUIRED_ATTRS: Record<string, string[]> = {
  checkbox: ["aria-checked"],
  combobox: ["aria-expanded"],
  heading: ["aria-level"],
  menuitemcheckbox: ["aria-checked"],
  menuitemradio: ["aria-checked"],
  meter: ["aria-valuenow"],
  radio: ["aria-checked"],
  scrollbar: ["aria-controls", "aria-valuenow"],
  separator: ["aria-valuenow"], // when focusable
  slider: ["aria-valuenow"],
  spinbutton: ["aria-valuenow"],
  switch: ["aria-checked"],
};

export const ariaRequiredAttr: Rule = {
  id: "aria/aria-required-attr",
  category: "aria",
  actRuleIds: ["4e8ab6"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "Elements with ARIA roles must have all required ARIA attributes.",
  guidance:
    "Some ARIA roles require specific attributes to function correctly. For example, checkbox requires aria-checked, slider requires aria-valuenow, heading requires aria-level. Without these attributes, assistive technologies cannot convey the element's state or value to users. Add the missing required attribute with an appropriate value.",
  run(doc) {
    const violations = [];
    for (const el of doc.querySelectorAll("[role]")) {
      if (isAriaHidden(el)) continue;
      if (el instanceof HTMLElement && el.style.display === "none") continue;
      const role = el.getAttribute("role")!.trim().toLowerCase();
      const required = REQUIRED_ATTRS[role];
      if (!required) continue;

      // Skip native elements that implicitly provide the state
      if (role === "checkbox" && el instanceof HTMLInputElement && el.type === "checkbox") continue;
      if (role === "radio" && el instanceof HTMLInputElement && el.type === "radio") continue;
      if (role === "option" && el instanceof HTMLOptionElement) continue;
      if (role === "heading" && /^h[1-6]$/i.test(el.tagName)) continue;

      // separator only requires aria-valuenow when focusable (interactive separator)
      if (role === "separator") {
        const tabindex = el.getAttribute("tabindex");
        if (!tabindex || tabindex === "-1") continue;
      }

      // Native <hr> elements have implicit separator role — skip
      if (el.tagName.toLowerCase() === "hr" && !el.hasAttribute("role")) continue;

      for (const attr of required) {
        if (!el.hasAttribute(attr)) {
          violations.push({
            ruleId: "aria/aria-required-attr",
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "critical" as const,
            message: `Role "${role}" requires attribute "${attr}".`,
            fix: { type: "add-attribute" as const, attribute: attr, value: "" },
          });
          break;
        }
      }
    }
    return violations;
  },
};
