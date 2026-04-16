import { createNameRule } from "./aria-name-helpers";

export const ariaInputFieldName = createNameRule({
  id: "labels-and-names/aria-input-field-name",
  selector: '[role="combobox"], [role="listbox"], [role="searchbox"], [role="slider"], [role="spinbutton"], [role="textbox"]',
  message: "ARIA input field has no accessible name.",
  fixability: "contextual",
  description: "ARIA input fields must have an accessible name.",
  guidance: "ARIA input widgets (combobox, listbox, searchbox, slider, spinbutton, textbox) must have accessible names so users understand what data to enter. Add a visible label with aria-labelledby, or use aria-label if a visible label is not possible.",
  fix: { type: "add-attribute", attribute: "aria-label", value: "" },
  checkComputedHidden: true,
  checkShadowDOM: true,
  skipNative: "input, select, textarea",
});
