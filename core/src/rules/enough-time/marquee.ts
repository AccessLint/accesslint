import type { DeclarativeRule } from "../types";
import { compileDeclarativeRule } from "../engine";

const marqueeSpec: DeclarativeRule = {
  id: "enough-time/marquee",
  selector: "marquee",
  check: { type: "selector-exists" },
  impact: "serious",
  message: "The <marquee> element causes accessibility issues. Replace with static content.",
  description: "The <marquee> element must not be used.",
  wcag: ["2.2.2"],
  level: "A",
  fixability: "mechanical",
  guidance: "Scrolling or moving content is difficult for many users to read, especially those with cognitive or visual disabilities. The <marquee> element is deprecated. Replace scrolling text with static content. If content must scroll, provide pause/stop controls and ensure it stops after 5 seconds.",
  fix: { type: "remove-element" },
};

export const marquee = compileDeclarativeRule(marqueeSpec);
