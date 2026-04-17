import { createNameRule } from "./aria-name-helpers";

export const ariaToggleFieldName = createNameRule({
  id: "labels-and-names/aria-toggle-field-name",
  selector:
    '[role="checkbox"], [role="switch"], [role="radio"], [role="menuitemcheckbox"], [role="menuitemradio"]',
  message: "ARIA toggle field has no accessible name.",
  fixability: "contextual",
  description: "ARIA toggle fields must have an accessible name.",
  guidance:
    "ARIA toggle controls (checkbox, switch, radio, menuitemcheckbox, menuitemradio) must have accessible names so users understand what option they're selecting. Add visible text content, aria-label, or use aria-labelledby to reference a visible label.",
  fix: { type: "add-attribute", attribute: "aria-label", value: "" },
  checkComputedHidden: true,
  checkShadowDOM: true,
  skipNative: 'input[type="checkbox"], input[type="radio"]',
});
