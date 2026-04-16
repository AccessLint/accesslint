import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, isVisibilityHidden, getExplicitAccessibleName } from "../utils/aria";

export const objectAlt: Rule = {
  id: "text-alternatives/object-alt",
  category: "text-alternatives",
  actRuleIds: ["8fc3b6"],
  wcag: ["1.1.1"],
  level: "A",
  fixability: "contextual",
  browserHint: "Screenshot the embedded object to see its content, then add aria-label or title describing it.",
  description: "<object> elements must have alternative text.",
  guidance: "Object elements embed external content that may not be accessible to all users. Provide alternative text via aria-label, aria-labelledby, or a title attribute. The fallback content inside <object> is only shown when the object fails to load and does not serve as an accessible name.",
  run(doc) {
    const violations = [];

    for (const obj of doc.querySelectorAll("object")) {
      if (isAriaHidden(obj)) continue;

      if (isVisibilityHidden(obj)) continue;

      // Skip objects that are purely decorative
      if (obj.getAttribute("role") === "presentation" || obj.getAttribute("role") === "none") {
        continue;
      }

      if (getExplicitAccessibleName(obj)) continue;

      // Skip objects loading HTML documents with accessible fallback content.
      // When a non-image object fails to load, the fallback is shown instead.
      const data = obj.getAttribute("data") || "";
      const type = obj.getAttribute("type") || "";
      const isImage = type.startsWith("image/") || /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(data);
      if (!isImage) {
        const fallbackImg = obj.querySelector("img[alt]");
        if (fallbackImg && fallbackImg.getAttribute("alt")?.trim()) continue;
      }

      violations.push({
        ruleId: "text-alternatives/object-alt",
        selector: getSelector(obj),
        html: getHtmlSnippet(obj),
        impact: "serious" as const,
        message: "<object> element is missing alternative text. Add aria-label, aria-labelledby, or a title attribute.",
        fix: { type: "add-attribute", attribute: "aria-label", value: "" } as const,
      });
    }

    return violations;
  },
};
