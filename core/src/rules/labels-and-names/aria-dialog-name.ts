import type { Rule } from "../types";
import { createNameRule } from "./aria-name-helpers";

export const ariaDialogName: Rule = createNameRule({
  id: "labels-and-names/aria-dialog-name",
  fixability: "contextual",
  description: "ARIA dialogs must have an accessible name.",
  guidance: "Dialog and alertdialog elements must have accessible names so screen reader users understand the dialog's purpose when it opens. Use aria-label or aria-labelledby pointing to the dialog's heading. Native <dialog> elements should also have an accessible name.",
  selector: '[role="dialog"], [role="alertdialog"], dialog',
  message: "Dialog has no accessible name.",
  fix: { type: "add-attribute", attribute: "aria-label", value: "" },
});
