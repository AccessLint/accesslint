import type { Rule } from "../types";
import { createNameRule } from "./aria-name-helpers";

export const ariaProgressbarName: Rule = createNameRule({
  id: "labels-and-names/aria-progressbar-name",
  fixability: "contextual",
  description: "ARIA progressbar elements must have an accessible name.",
  guidance: "Progress indicators must have accessible names so screen reader users understand what process is being tracked. Use aria-label (e.g., 'File upload progress') or aria-labelledby to reference a visible heading or label.",
  selector: '[role="progressbar"], progress',
  message: "Progressbar has no accessible name.",
  fix: { type: "add-attribute", attribute: "aria-label", value: "" },
});
