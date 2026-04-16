import type { Rule } from "../types";
import { createNameRule } from "./aria-name-helpers";

export const ariaMeterName: Rule = createNameRule({
  id: "labels-and-names/aria-meter-name",
  fixability: "contextual",
  description: "ARIA meter elements must have an accessible name.",
  guidance: "Meter elements display a value within a known range (like disk usage or password strength). They must have accessible names so screen reader users understand what is being measured. Use aria-label or aria-labelledby to provide context.",
  selector: '[role="meter"], meter',
  message: "Meter has no accessible name.",
  fix: { type: "add-attribute", attribute: "aria-label", value: "" },
});
