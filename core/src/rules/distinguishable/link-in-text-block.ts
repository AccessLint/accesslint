import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getAccessibleTextContent } from "../utils/aria";
import {
  getCachedComputedStyle,
  parseColor,
  getLuminance,
  getContrastRatio,
} from "../utils/color";

const BLOCK_DISPLAYS = new Set([
  "block", "flex", "grid", "table", "table-cell", "list-item", "flow-root",
]);

const INLINE_DISPLAYS = new Set([
  "inline", "inline-block", "inline-flex", "inline-grid",
]);

/**
 * Walk up from `link` to its nearest block-level ancestor.  When that block
 * contains non-link prose (multiple words), return the block and the computed
 * foreground color of the first non-link text node.  A single pass replaces
 * the old findParentTextBlock / hasNonLinkText / getSurroundingTextColor trio.
 */
function getTextBlockContext(
  link: Element,
): { block: Element; textColor: [number, number, number] } | null {
  let block: Element | null = link.parentElement;
  while (block) {
    if (BLOCK_DISPLAYS.has(getCachedComputedStyle(block).display)) break;
    block = block.parentElement;
  }
  if (!block) return null;

  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let nonLinkText = "";
  let textColor: [number, number, number] | null = null;
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    if (!node.data.trim()) continue;
    let cur: Element | null = node.parentElement;
    let insideLink = false;
    while (cur && cur !== block) {
      if (cur.tagName === "A") { insideLink = true; break; }
      cur = cur.parentElement;
    }
    if (insideLink) continue;
    nonLinkText += node.data;
    if (!textColor && node.parentElement) {
      textColor = parseColor(getCachedComputedStyle(node.parentElement).color);
    }
  }

  // Require at least two 3-letter words — ensures real prose, not short
  // labels like "By:" or "Source:" or pipe-separated link lists.
  const words = nonLinkText.match(/\p{L}{3,}/gu);
  if (!textColor || !words || words.length < 2) return null;
  return { block, textColor };
}

function hasDistinctDecoration(style: CSSStyleDeclaration, parentDeco: string): boolean {
  const deco = style.textDecorationLine || style.textDecoration || "";
  return (deco.includes("underline") || deco.includes("line-through")) && deco !== parentDeco;
}

function fontWeight(w: string): number {
  return w === "bold" ? 700 : w === "normal" ? 400 : parseInt(w) || 400;
}

function _hasOnlyMediaContent(link: Element): boolean {
  const walker = link.ownerDocument.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.data.trim()) return false;
  }
  return true;
}

export const linkInTextBlock: Rule = {
  id: "distinguishable/link-in-text-block",
  category: "distinguishable",
  wcag: ["1.4.1"],
  level: "A",
  fixability: "visual",
  browserHint: "Screenshot the text block to see how the link blends with surrounding text, then verify your fix (e.g., underline or border) makes the link visually distinct.",
  description: "Links within text blocks must be distinguishable by more than color alone.",
  guidance: "Users who cannot perceive color differences need other visual cues to identify links. Links in text should have underlines or other non-color indicators. If using color alone, ensure 3:1 contrast with surrounding text AND provide additional indication on focus/hover.",
  run(doc) {
    const violations = [];

    for (const link of doc.querySelectorAll("a[href]")) {
      if (isAriaHidden(link)) continue;
      if (!getAccessibleTextContent(link).trim()) continue;
      if (_hasOnlyMediaContent(link)) continue;
      if (link.closest('nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]')) continue;

      const linkStyle = getCachedComputedStyle(link);
      if (!INLINE_DISPLAYS.has(linkStyle.display || "inline")) continue;

      const ctx = getTextBlockContext(link);
      if (!ctx) continue;

      // --- Non-color visual distinction ---
      const blockStyle = getCachedComputedStyle(ctx.block);
      const parentDeco = blockStyle.textDecorationLine || blockStyle.textDecoration || "";

      if (hasDistinctDecoration(linkStyle, parentDeco)) continue;

      const bw = parseFloat(linkStyle.borderBottomWidth) || 0;
      if (bw > 0 && linkStyle.borderBottomStyle !== "none" && linkStyle.borderBottomStyle !== "hidden") continue;

      if (Math.abs(fontWeight(linkStyle.fontWeight) - fontWeight(blockStyle.fontWeight)) >= 300) continue;
      if (linkStyle.fontStyle !== blockStyle.fontStyle) continue;

      const linkSize = parseFloat(linkStyle.fontSize) || 16;
      const parentSize = parseFloat(blockStyle.fontSize) || 16;
      if (parentSize > 0 && linkSize / parentSize >= 1.2) continue;

      // Check descendants (e.g. inner <span> with underline or bold)
      let descendantDistinct = false;
      for (const desc of link.querySelectorAll("*")) {
        const ds = getCachedComputedStyle(desc);
        if (hasDistinctDecoration(ds, parentDeco) ||
            Math.abs(fontWeight(ds.fontWeight) - fontWeight(blockStyle.fontWeight)) >= 300) {
          descendantDistinct = true;
          break;
        }
      }
      if (descendantDistinct) continue;

      // --- Color contrast with surrounding text ---
      const linkColor = parseColor(linkStyle.color);
      if (!linkColor) continue;

      const linkLum = getLuminance(...linkColor);
      const textLum = getLuminance(...ctx.textColor);
      const ratio = getContrastRatio(linkLum, textLum);

      if (ratio < 1.1 || ratio >= 3) continue;

      const hex = (c: [number, number, number]) =>
        "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

      violations.push({
        ruleId: "distinguishable/link-in-text-block",
        selector: getSelector(link),
        html: getHtmlSnippet(link),
        impact: "serious" as const,
        message:
          "Link in text block is not visually distinguishable from surrounding text. Add a non-color visual indicator such as an underline or border.",
        context:
          `link color: ${hex(linkColor)} rgb(${linkColor.join(", ")}), ` +
          `surrounding text: ${hex(ctx.textColor)} rgb(${ctx.textColor.join(", ")}), ` +
          `ratio: ${ratio.toFixed(2)}:1`,
        fix: { type: "suggest", suggestion: "Add text-decoration: underline to the link, or add a visible border-bottom. If relying on color contrast alone, ensure at least 3:1 ratio between the link color and surrounding text color." } as const,
      });
    }

    return violations;
  },
};
