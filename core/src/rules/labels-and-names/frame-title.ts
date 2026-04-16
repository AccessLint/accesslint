import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden } from "../utils/aria";
import { isHiddenFrame } from "../landmarks/constants";

export const frameTitle: Rule = {
  id: "labels-and-names/frame-title",
  category: "labels-and-names",
  actRuleIds: ["cae760"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint: "Screenshot the iframe to see what content it displays, then add a title describing its purpose.",
  description: "Frames must have an accessible name.",
  guidance: "Screen readers announce frame titles when users navigate frames. Add a title attribute to <iframe> and <frame> elements that describes the frame's purpose (e.g., <iframe title='Video player'>). Avoid generic titles like 'frame' or 'iframe'. If the frame is decorative, use aria-hidden='true'.",
  run(doc) {
    const violations = [];
    for (const frame of doc.querySelectorAll("iframe, frame")) {
      if (isAriaHidden(frame)) continue;
      if (isHiddenFrame(frame)) continue;
      const name = getAccessibleName(frame);
      if (!name) {
        const src = frame.getAttribute("src");
        violations.push({
          ruleId: "labels-and-names/frame-title",
          selector: getSelector(frame),
          html: getHtmlSnippet(frame),
          impact: "serious" as const,
          message: "Frame is missing an accessible name. Add a title attribute.",
          context: src ? `src: "${src}"` : undefined,
          fix: { type: "add-attribute", attribute: "title", value: "" } as const,
        });
      }
    }
    return violations;
  },
};
