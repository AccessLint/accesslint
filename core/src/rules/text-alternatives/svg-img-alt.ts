import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getExplicitAccessibleName } from "../utils/aria";

/**
 * Get the accessible name of an SVG: explicit name (aria-labelledby,
 * aria-label, title attribute) with a fallback to a child <title> element.
 */
function getSvgAccessibleName(el: Element): string {
  const explicit = getExplicitAccessibleName(el);
  if (explicit) return explicit;

  // <title> element child (SVG-specific naming mechanism)
  const title = el.querySelector("title");
  if (title?.textContent?.trim()) return title.textContent.trim();

  return "";
}

export const svgImgAlt: Rule = {
  id: "text-alternatives/svg-img-alt",
  category: "text-alternatives",
  actRuleIds: ["7d6734"],
  wcag: ["1.1.1"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the SVG to understand its content, then add a title element or aria-label.",
  description:
    "SVG elements with an img, graphics-document, or graphics-symbol role must have an accessible name via a <title> element, aria-label, or aria-labelledby.",
  guidance:
    "Inline SVGs with role='img' need accessible names. Add a <title> element as the first child of the SVG (screen readers will announce it), or use aria-label on the SVG element. For complex SVGs, use aria-labelledby referencing both a <title> and <desc> element. Decorative SVGs should use aria-hidden='true' instead.",
  run(doc) {
    const violations = [];

    // Check SVGs with role="img" and child elements with graphics roles
    const selector = 'svg[role="img"], [role="graphics-document"], [role="graphics-symbol"]';
    for (const el of doc.querySelectorAll(selector)) {
      if (isAriaHidden(el)) continue;
      const name = getSvgAccessibleName(el);
      if (!name) {
        const role = el.getAttribute("role");
        violations.push({
          ruleId: "text-alternatives/svg-img-alt",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: `${el.tagName.toLowerCase()} with role='${role}' has no accessible name.`,
          fix: { type: "add-attribute", attribute: "aria-label", value: "" } as const,
        });
      }
    }
    return violations;
  },
};
