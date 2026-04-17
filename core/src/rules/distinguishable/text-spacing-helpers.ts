import { isAriaHidden } from "../utils/aria";
import { getCachedComputedStyle } from "../utils/color";
import { getSelector, getHtmlSnippet } from "../utils/selector";

/**
 * Parsed result from an !important inline style property.
 */
export interface ImportantResult {
  /** Value in em or unitless ratio (directly comparable to threshold) */
  em: number | null;
  /** Raw px value (needs per-text-element font-size conversion) */
  px: number | null;
}

/** Escape a string for safe use inside a RegExp pattern. */
export function escapeRegExp(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Parse the *last* CSS property value with !important from an inline style.
 *
 * Returns em/unitless values directly, and px values separately so callers
 * can convert using the affected text element's computed font-size.
 */
export function getImportantValue(el: Element, property: string): ImportantResult | null {
  const style = el.getAttribute("style");
  if (!style) return null;

  // Match all occurrences of  property: value !important  (last one wins)
  const regex = new RegExp(`${escapeRegExp(property)}\\s*:\\s*([^;!]+)\\s*!\\s*important`, "gi");
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(style))) {
    lastMatch = m;
  }
  if (!lastMatch) return null;

  const raw = lastMatch[1].trim();

  // inherit / unset — these defer to the parent's value and do NOT restrict
  // user overrides, so they should not be flagged.
  if (/^(inherit|unset|revert)$/i.test(raw)) return null;

  // normal / initial — effectively zero spacing (below any positive threshold)
  if (/^(normal|initial)$/i.test(raw)) return { em: 0, px: null };

  // em units — directly comparable
  const emMatch = raw.match(/^(-?[\d.]+)\s*em$/i);
  if (emMatch) return { em: parseFloat(emMatch[1]), px: null };

  // Unitless number (used for line-height)
  const unitless = raw.match(/^(-?[\d.]+)$/);
  if (unitless) return { em: parseFloat(unitless[1]), px: null };

  // Percentage (used for line-height) — convert to ratio (120% → 1.2)
  const pctMatch = raw.match(/^(-?[\d.]+)\s*%$/);
  if (pctMatch) return { em: parseFloat(pctMatch[1]) / 100, px: null };

  // Absolute units (px, pt, cm, mm, in) — return as px for caller to convert
  const pxMatch = raw.match(/^(-?[\d.]+)\s*(px|pt|cm|mm|in)$/i);
  if (pxMatch) {
    const value = parseFloat(pxMatch[1]);
    const unit = pxMatch[2].toLowerCase();
    let px: number;
    switch (unit) {
      case "px":
        px = value;
        break;
      case "pt":
        px = value * (4 / 3);
        break;
      case "cm":
        px = value * (96 / 2.54);
        break;
      case "mm":
        px = value * (96 / 25.4);
        break;
      case "in":
        px = value * 96;
        break;
      default:
        return null;
    }
    return { em: null, px };
  }

  return null;
}

/**
 * Check if any text descendant of `el` (affected by the inherited property)
 * has the px spacing value below the threshold relative to its own computed font-size.
 */
export function anyTextViolatesPx(
  el: Element,
  property: string,
  pxValue: number,
  threshold: number,
): boolean {
  function walk(node: Element): boolean {
    // If child overrides with its own !important, its text is NOT affected
    if (node !== el) {
      const childStyle = node.getAttribute("style") || "";
      const hasOwn = new RegExp(
        `${escapeRegExp(property)}\\s*:\\s*[^;!]+\\s*!\\s*important`,
        "i",
      ).test(childStyle);
      if (hasOwn) return false;
    }

    // Check direct text nodes
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && child.textContent?.trim()) {
        const fontSize = parseFloat(getCachedComputedStyle(node).fontSize);
        if (fontSize > 0 && pxValue / fontSize < threshold) return true;
        break; // found text at this level, no need to check more text nodes
      }
    }

    // Recurse into child elements
    for (const child of node.children) {
      if (walk(child)) return true;
    }
    return false;
  }
  return walk(el);
}

/** Check if element has direct text node children (non-whitespace). */
export function hasDirectText(el: Element): boolean {
  for (const child of el.childNodes) {
    if (child.nodeType === 3 /* TEXT_NODE */ && child.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

/** Check if an element is an HTML element (not SVG/MathML). */
export function isHtmlElement(el: Element): boolean {
  return !el.closest("svg") && !el.closest("math");
}

/** Check if an element is positioned offscreen and therefore not visible. */
export function isOffscreen(el: Element): boolean {
  const style = el.getAttribute("style");
  if (!style) return false;

  // Check for absolute/fixed positioning with extreme offsets
  if (/position\s*:\s*(absolute|fixed)/i.test(style)) {
    // Negative top/left/right/bottom with large values
    const topMatch = style.match(/top\s*:\s*(-[\d.]+)(em|px|%)/i);
    if (topMatch && parseFloat(topMatch[1]) < -100) return true;
    const leftMatch = style.match(/left\s*:\s*(-[\d.]+)(em|px|%)/i);
    if (leftMatch && parseFloat(leftMatch[1]) < -100) return true;
  }

  return false;
}

/**
 * Check if an element has visible descendant text that is NOT overridden by
 * a descendant's own !important declaration for the same property.
 */
export function hasAffectedText(el: Element, property: string): boolean {
  // Direct text nodes are always affected
  if (hasDirectText(el)) return true;

  // Check child elements recursively
  for (const child of el.children) {
    const childStyle = child.getAttribute("style") || "";
    const hasOwnImportant = new RegExp(
      `${escapeRegExp(property)}\\s*:\\s*[^;!]+\\s*!\\s*important`,
      "i",
    ).test(childStyle);

    // If child overrides with its own !important, its text is NOT affected
    if (hasOwnImportant) continue;

    // Otherwise, recursively check if child has affected text
    if (hasAffectedText(child, property)) return true;
  }

  return false;
}

/**
 * Shared logic for letter-spacing and word-spacing rules.
 */
export function checkTextSpacing(
  doc: Document,
  ruleId: string,
  property: string,
  threshold: number,
): { ruleId: string; selector: string; html: string; impact: "serious"; message: string }[] {
  const violations: {
    ruleId: string;
    selector: string;
    html: string;
    impact: "serious";
    message: string;
  }[] = [];

  for (const el of doc.querySelectorAll("[style]")) {
    if (isAriaHidden(el)) continue;
    if (!isHtmlElement(el)) continue;
    if (isOffscreen(el)) continue;
    if (!hasAffectedText(el, property)) continue;

    const result = getImportantValue(el, property);
    if (!result) continue;

    let violates = false;
    if (result.em !== null) {
      violates = result.em < threshold;
    } else if (result.px !== null) {
      // For px values, check each affected text node using its own computed font-size
      violates = anyTextViolatesPx(el, property, result.px, threshold);
    }

    if (violates) {
      const displayValue =
        result.em !== null
          ? `${result.em}${property === "line-height" ? "" : "em"}`
          : `${result.px}px`;
      violations.push({
        ruleId,
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "serious" as const,
        message: `${property} ${displayValue} with !important is below the ${threshold}${property === "line-height" ? "" : "em"} minimum.`,
      });
    }
  }

  return violations;
}

/**
 * Check if the element's text doesn't wrap vertically because it's inside
 * a horizontal-only scroll container with wide content.
 */
export function hasHorizontalOnlyScroll(el: Element): boolean {
  let current: Element | null = el;
  let wideChild = false;

  while (current) {
    const style = getCachedComputedStyle(current);

    // Check if this element prevents wrapping via width or white-space
    const width = parseFloat(style.width);
    if (width > 500) wideChild = true;
    if (style.whiteSpace === "nowrap" || style.whiteSpace === "pre") wideChild = true;

    const overflowX = style.overflowX;
    const overflowY = style.overflowY;
    // Found a horizontal scroll container
    if (
      (overflowX === "scroll" || overflowX === "auto") &&
      overflowY !== "scroll" &&
      overflowY !== "auto"
    ) {
      return wideChild;
    }

    current = current.parentElement;
  }
  return false;
}
