import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isComputedHidden } from "../utils/aria";

function getLinkContext(el: Element): string | undefined {
  const parts: string[] = [];

  // Include href
  const href = el.getAttribute("href");
  if (href) parts.push(`href: ${href}`);

  // Check for nearby heading or label
  const parent = el.parentElement;
  if (parent) {
    const heading = parent.closest("h1, h2, h3, h4, h5, h6");
    if (heading?.textContent?.trim()) {
      parts.push(`Nearby heading: ${heading.textContent.trim().slice(0, 80)}`);
    } else {
      const text = parent.textContent?.trim().slice(0, 100);
      if (text) parts.push(`Parent text: ${text}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export const linkName: Rule = {
  id: "navigable/link-name",
  category: "navigable",
  actRuleIds: ["c487ae"],
  wcag: ["2.4.4", "4.1.2"],
  level: "A",
  fixability: "contextual",
  browserHint:
    "Screenshot the link in context to understand its destination, then write descriptive link text.",
  description: "Links must have discernible text via content, aria-label, or aria-labelledby.",
  guidance:
    "Screen reader users need to know where a link goes. Add descriptive text content, aria-label, or use aria-labelledby. For image links, ensure the image has alt text describing the link destination. Avoid generic text like 'click here' or 'read more'—link text should make sense out of context.",
  applicable: (doc) =>
    Array.from(doc.querySelectorAll("a[href], area[href]")).some((el) => {
      const role = el.getAttribute("role");
      return !role || role === "link";
    }),
  run(doc) {
    const violations = [];
    for (const a of doc.querySelectorAll('a[href], area[href], [role="link"]')) {
      if (isAriaHidden(a)) continue;
      if (isComputedHidden(a)) continue;
      // Skip shadow DOM elements — name resolution can't reliably cross shadow boundaries
      if (a.getRootNode() instanceof ShadowRoot) continue;
      const name = getAccessibleName(a);
      if (!name) {
        violations.push({
          ruleId: "navigable/link-name",
          selector: getSelector(a),
          html: getHtmlSnippet(a),
          impact: "serious" as const,
          message: "Link has no discernible text.",
          context: getLinkContext(a),
          fix: { type: "add-text-content" } as const,
        });
      }
    }
    return violations;
  },
};
