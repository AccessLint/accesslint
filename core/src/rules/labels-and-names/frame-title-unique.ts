import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { isHiddenFrame } from "../landmarks/constants";

export const frameTitleUnique: Rule = {
  id: "labels-and-names/frame-title-unique",
  category: "labels-and-names",
  actRuleIds: ["4b1c6c"],
  wcag: ["4.1.2"],
  level: "A",
  tags: ["best-practice"],
  fixability: "contextual",
  description: "Frame titles should be unique.",
  guidance:
    "When multiple frames have identical titles, screen reader users cannot distinguish between them. Give each frame a unique, descriptive title that explains its specific purpose or content.",
  run(doc) {
    const violations = [];
    const frames = Array.from(doc.querySelectorAll("iframe[title], frame[title]"));
    const titleMap = new Map<string, Element[]>();

    for (const frame of frames) {
      if (isAriaHidden(frame)) continue;
      if (isHiddenFrame(frame)) continue;

      const title = frame.getAttribute("title")?.trim().toLowerCase();
      if (title) {
        const existing = titleMap.get(title) || [];
        existing.push(frame);
        titleMap.set(title, existing);
      }
    }

    for (const [, elements] of titleMap) {
      if (elements.length > 1) {
        // Report all but the first as violations
        for (const frame of elements.slice(1)) {
          violations.push({
            ruleId: "labels-and-names/frame-title-unique",
            selector: getSelector(frame),
            html: getHtmlSnippet(frame),
            impact: "moderate" as const,
            message: "Frame title is not unique. Use a distinct title for each frame.",
          });
        }
      }
    }
    return violations;
  },
};
