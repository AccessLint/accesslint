import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, isVisibilityHidden } from "../utils/aria";

function getImageContext(img: Element): string | undefined {
  const parts: string[] = [];

  // Check if inside a link
  const link = img.closest("a");
  if (link) {
    const href = link.getAttribute("href");
    if (href) parts.push(`Link href: ${href}`);
  }

  // Check for figcaption
  const figure = img.closest("figure");
  if (figure) {
    const caption = figure.querySelector("figcaption");
    if (caption?.textContent?.trim()) {
      parts.push(`Figcaption: ${caption.textContent.trim().slice(0, 100)}`);
    }
  }

  // Get adjacent text from parent
  const parent = img.parentElement;
  if (parent && parent !== link) {
    const alt = img instanceof HTMLImageElement ? img.alt || "" : "";
    const text = parent.textContent?.replace(alt, "").trim().slice(0, 100);
    if (text) parts.push(`Adjacent text: ${text}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export const imgAlt: Rule = {
  id: "text-alternatives/img-alt",
  category: "text-alternatives",
  actRuleIds: ["23a2a8"],
  wcag: ["1.1.1"],
  level: "A",
  fixability: "contextual",
  browserHint: "Screenshot the image to describe its visual content for alt text.",
  description:
    "Images must have alternate text. Add an alt attribute to <img> elements. Decorative images may use an empty alt attribute (alt=\"\"), role='none', or role='presentation'.",
  guidance:
    "Every image needs an alt attribute. For informative images, describe the content or function concisely. For decorative images (backgrounds, spacers, purely visual flourishes), use alt='' to hide them from screen readers. Never omit alt entirely—screen readers may read the filename instead. When an image is inside a link or button that already has text, use alt='' if the image is decorative in that context, or write alt text that complements (not duplicates) the existing text.",
  run(doc) {
    const violations = [];

    // Check <img> elements
    for (const img of doc.querySelectorAll("img")) {
      if (isAriaHidden(img)) continue;
      if (isVisibilityHidden(img)) continue;

      const role = img.getAttribute("role");

      // Presentation/none role is overridden when the element is focusable
      if (role === "presentation" || role === "none") {
        const tabindex = img.getAttribute("tabindex");
        if (!tabindex || tabindex === "-1") continue; // truly decorative
        // Falls through — focusable images with presentation role need alt
      }

      const alt = img.getAttribute("alt");
      // Whitespace-only alt (not empty "") is not a valid accessible name
      if (alt !== null && alt.trim() === "" && alt !== "") {
        violations.push({
          ruleId: "text-alternatives/img-alt",
          selector: getSelector(img),
          html: getHtmlSnippet(img),
          impact: "critical" as const,
          message: "Image has whitespace-only alt text. Use alt=\"\" for decorative images or provide descriptive text.",
          context: getImageContext(img),
          fix: { type: "set-attribute", attribute: "alt", value: "" } as const,
        });
        continue;
      }

      if (!img.hasAttribute("alt") && !getAccessibleName(img)) {
        violations.push({
          ruleId: "text-alternatives/img-alt",
          selector: getSelector(img),
          html: getHtmlSnippet(img),
          impact: "critical" as const,
          message: "Image element missing alt attribute.",
          context: getImageContext(img),
          fix: { type: "add-attribute", attribute: "alt", value: "" } as const,
        });
      }
    }

    return violations;
  },
};
