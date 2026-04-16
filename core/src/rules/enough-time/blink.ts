import type { DeclarativeRule } from "../types";
import { compileDeclarativeRule } from "../engine";

const blinkSpec: DeclarativeRule = {
  id: "enough-time/blink",
  selector: "blink",
  check: { type: "selector-exists" },
  impact: "serious",
  message: "The <blink> element causes accessibility issues. Remove it entirely.",
  description: "The <blink> element must not be used.",
  wcag: ["2.2.2"],
  level: "A",
  fixability: "mechanical",
  guidance: "Blinking content can cause seizures in users with photosensitive epilepsy and is distracting for users with attention disorders. The <blink> element is deprecated and should never be used. If you need to draw attention to content, use less intrusive methods like color, borders, or icons.",
  fix: { type: "remove-element" },
};

export const blink = compileDeclarativeRule(blinkSpec);
