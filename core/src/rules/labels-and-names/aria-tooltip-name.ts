import type { Rule } from "../types";
import { createNameRule } from "./aria-name-helpers";

export const ariaTooltipName: Rule = createNameRule({
  id: "labels-and-names/aria-tooltip-name",
  fixability: "contextual",
  description: "ARIA tooltips must have an accessible name.",
  guidance:
    "Tooltip elements must have accessible names (usually their text content). The tooltip content itself typically serves as the accessible name. Ensure the tooltip contains descriptive text content or has aria-label.",
  selector: '[role="tooltip"]',
  message: "Tooltip has no accessible name.",
  fix: { type: "add-text-content" },
});
