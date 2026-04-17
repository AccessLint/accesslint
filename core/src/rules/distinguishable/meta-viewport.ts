import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

export const metaViewport: Rule = {
  id: "distinguishable/meta-viewport",
  category: "distinguishable",
  actRuleIds: ["b4f0c3"],
  wcag: ["1.4.4"],
  level: "AA",
  tags: ["page-level"],
  fixability: "mechanical",
  browserHint:
    "After fixing the viewport meta tag, resize the viewport to 320px wide and screenshot to verify content remains readable and usable.",
  description: "Viewport meta tag must not disable user scaling.",
  guidance:
    "Users with low vision need to zoom content up to 200% or more. Setting user-scalable=no or maximum-scale=1 prevents zooming and fails WCAG. Remove these restrictions. If your layout breaks at high zoom, fix the responsive design rather than preventing zoom.",
  run(doc) {
    const violations = [];

    const viewport = doc.querySelector('meta[name="viewport"]');
    if (!viewport) return [];

    const content = viewport.getAttribute("content") || "";
    const contentLower = content.toLowerCase();

    // Check for user-scalable=no or numeric values that disable scaling.
    // Browsers treat values between -1 and 1 (exclusive) as disabling zoom.
    const userScalableMatch = contentLower.match(/user-scalable\s*=\s*([^\s,;]+)/i);
    if (userScalableMatch) {
      const raw = userScalableMatch[1];
      const num = parseFloat(raw);
      const isDisabled = raw === "no" || (!isNaN(num) && num > -1 && num < 1);
      if (isDisabled) {
        violations.push({
          ruleId: "distinguishable/meta-viewport",
          selector: getSelector(viewport),
          html: getHtmlSnippet(viewport),
          impact: "critical" as const,
          message: `Viewport disables user scaling (user-scalable=${raw}). Remove this restriction.`,
          context: `content: "${content}"`,
          fix: {
            type: "suggest",
            suggestion: "Remove user-scalable=no from the viewport meta content attribute",
          } as const,
        });
      }
    }

    // Check for maximum-scale < 2 (including "yes" which browsers treat as 1)
    const maxScaleMatch = contentLower.match(/maximum-scale\s*=\s*([\d.]+|yes)/i);
    if (maxScaleMatch) {
      const rawValue = maxScaleMatch[1];
      const maxScale = rawValue.toLowerCase() === "yes" ? 1 : parseFloat(rawValue);
      if (maxScale < 2) {
        violations.push({
          ruleId: "distinguishable/meta-viewport",
          selector: getSelector(viewport),
          html: getHtmlSnippet(viewport),
          impact: "critical" as const,
          message: `Viewport maximum-scale=${maxScale} restricts zooming. Set to at least 2 or remove.`,
          context: `content: "${content}"`,
          fix: {
            type: "suggest",
            suggestion:
              "Remove maximum-scale or set it to at least 2 in the viewport meta content attribute",
          } as const,
        });
      }
    }

    return violations;
  },
};
