import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden } from "../utils/aria";

export const areaAlt: Rule = {
  id: "text-alternatives/area-alt",
  category: "text-alternatives",
  wcag: ["1.1.1", "4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "Image map <area> elements must have alternative text.",
  guidance: "Each clickable region in an image map needs alternative text so screen reader users know what the region represents. Add an alt attribute to every <area> element describing its purpose. For complex image maps, consider using alternative approaches like SVG with embedded links, or a list of text links.",
  run(doc) {
    const violations = [];

    for (const area of doc.querySelectorAll("area[href]")) {
      if (isAriaHidden(area)) continue;

      const name = getAccessibleName(area);
      if (!name) {
        violations.push({
          ruleId: "text-alternatives/area-alt",
          selector: getSelector(area),
          html: getHtmlSnippet(area),
          impact: "critical" as const,
          message: "Image map <area> element is missing alternative text.",
          fix: { type: "add-attribute", attribute: "alt", value: "" } as const,
        });
      }
    }

    return violations;
  },
};
