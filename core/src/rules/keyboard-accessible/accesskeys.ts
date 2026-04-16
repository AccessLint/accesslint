import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const accesskeys: Rule = {
  id: "keyboard-accessible/accesskeys",
  category: "keyboard-accessible",
  wcag: [],
  level: "A",
  tags: ["best-practice"],
  fixability: "mechanical",
  description: "Accesskey attribute values must be unique.",
  guidance: "When multiple elements share the same accesskey, browser behavior becomes unpredictable - usually only the first element is activated. Ensure each accesskey value is unique within the page. Also consider that accesskeys can conflict with browser and screen reader shortcuts, so use them sparingly.",
  run(doc) {
    const violations = [];
    const accessKeyMap = new Map<string, Element[]>();

    for (const el of doc.querySelectorAll("[accesskey]")) {
      if (isAriaHidden(el)) continue;

      const key = el.getAttribute("accesskey")?.trim().toLowerCase();
      if (!key) continue;

      const existing = accessKeyMap.get(key) || [];
      existing.push(el);
      accessKeyMap.set(key, existing);
    }

    for (const [key, elements] of accessKeyMap) {
      if (elements.length > 1) {
        // Report all duplicates except the first
        for (const el of elements.slice(1)) {
          violations.push({
            ruleId: "keyboard-accessible/accesskeys",
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "serious" as const,
            message: `Duplicate accesskey "${key}". Each accesskey must be unique.`,
          });
        }
      }
    }

    return violations;
  },
};
