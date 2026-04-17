import { getSelector, getHtmlSnippet } from "../utils/selector";
import {
  getCachedComputedStyle,
  parseColor,
  parseColorAlpha,
  compositeColors,
  getEffectiveBackgroundColor,
  getLuminance,
  getContrastRatio,
  isLargeText,
  mayBeOverImage,
  parseGradientStops,
  parseTextShadow,
  hasPseudoElementBackground,
  rgbToHex,
  getContrastWithShadow,
  getAccumulatedOpacity,
} from "../utils/color";
import type { TextShadow } from "../utils/color";
import {
  NON_TEXT_TAGS,
  isHidden,
  isDisabledFormElement,
  isLabelForDisabledControl,
  isInsideNativeSelect,
  hasOnlyNonTextCharacters,
  isInAriaDisabledGroup,
} from "../utils/visibility";
import { hasUnreliableVisualEffects } from "../utils/filters";

/** Find the nearest ancestor (or self) with a CSS gradient background. */
function findAncestorGradient(el: Element): { bgImage: string; gradientEl: Element } | null {
  let current: Element | null = el;
  while (current) {
    const style = getCachedComputedStyle(current);
    const bgImg = style.backgroundImage;
    if (bgImg && bgImg !== "none" && bgImg !== "initial") {
      return bgImg.includes("gradient(") ? { bgImage: bgImg, gradientEl: current } : null;
    }
    const bg = style.backgroundColor;
    if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || bg === "rgba(0 0 0 / 0)") {
      current = current.parentElement;
      continue;
    }
    // Nearly transparent — keep looking
    if (parseColorAlpha(bg) < 0.01) {
      current = current.parentElement;
      continue;
    }
    // Solid background found — no gradient shows through
    return null;
  }
  return null;
}

/** Check gradient background contrast and return a violation if insufficient. */
function checkGradientContrast(
  el: Element,
  fg: [number, number, number],
  fgAlpha: number,
  accumulatedOpacity: number,
  threshold: number,
  ruleId: string,
  level: "AA" | "AAA",
  gradientBg: string,
  transparentFallback: [number, number, number],
) {
  const stops = parseGradientStops(gradientBg, transparentFallback);
  if (stops.length === 0) return null;

  // Use the gradient stop that gives the BEST contrast with fg.
  // ACT rule afw4f7: if the highest possible contrast of any text
  // character meets the threshold, the element passes. Only flag
  // when even the best stop fails.
  let bestRatio = 0;
  let bestBg = stops[0];
  for (const stop of stops) {
    let testFg = fg;
    if (fgAlpha < 1) testFg = compositeColors(fg, stop, fgAlpha);
    if (accumulatedOpacity < 1) testFg = compositeColors(testFg, stop, accumulatedOpacity);
    const r = getContrastRatio(
      getLuminance(testFg[0], testFg[1], testFg[2]),
      getLuminance(stop[0], stop[1], stop[2]),
    );
    if (r > bestRatio) {
      bestRatio = r;
      bestBg = stop;
    }
  }

  if (bestRatio >= threshold) return null;

  let effectiveFg = fg;
  if (fgAlpha < 1) effectiveFg = compositeColors(fg, bestBg, fgAlpha);
  if (accumulatedOpacity < 1)
    effectiveFg = compositeColors(effectiveFg, bestBg, accumulatedOpacity);
  const roundedRatio = Math.round(bestRatio * 100) / 100;
  return {
    ruleId,
    selector: getSelector(el),
    html: getHtmlSnippet(el),
    impact: "serious" as const,
    message: `Insufficient${level === "AAA" ? " enhanced" : ""} color contrast ratio of ${roundedRatio}:1 (required ${threshold}:1).`,
    context: `foreground: ${rgbToHex(effectiveFg)} rgb(${effectiveFg.join(", ")}), background: gradient, ratio: ${roundedRatio}:1, required: ${threshold}:1`,
    fix: {
      type: "suggest" as const,
      suggestion: `Change the text color or gradient background so the contrast ratio meets ${threshold}:1. The current foreground is ${rgbToHex(effectiveFg)}.`,
    },
  };
}

export function checkContrast(doc: Document, ruleId: string, level: "AA" | "AAA") {
  const violations = [];
  const body = doc.body;
  if (!body) return [];

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const checked = new Set<Element>();

  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!node.textContent || !node.textContent.trim()) continue;

    // Skip non-text characters (symbols, punctuation, math operators)
    if (hasOnlyNonTextCharacters(node.textContent)) continue;

    const el = node.parentElement;
    if (!el) continue;
    if (checked.has(el)) continue;
    checked.add(el);

    if (NON_TEXT_TAGS.has(el.tagName)) continue;

    // Skip <body> and <html> text nodes
    const tag = el.tagName;
    if (tag === "BODY" || tag === "HTML") continue;

    // Skip elements inside native <select> — browser-controlled rendering
    if (isInsideNativeSelect(el)) continue;

    if (isDisabledFormElement(el)) continue;
    if (isLabelForDisabledControl(el, doc)) continue;
    // Skip elements inside aria-disabled containers
    if (isInAriaDisabledGroup(el)) continue;
    if (isHidden(el)) continue;

    const style = getCachedComputedStyle(el);

    // Skip transparent/zero-opacity text
    if (parseFloat(style.opacity) === 0) continue;

    const accumulatedOpacity = getAccumulatedOpacity(el);
    // Skip effectively invisible elements
    if (accumulatedOpacity < 0.1) continue;

    // Parse text-shadow for three-way contrast computation
    const textShadow = style.textShadow;
    let parsedShadows: TextShadow[] | null = null;
    if (textShadow && textShadow !== "none" && textShadow !== "initial") {
      parsedShadows = parseTextShadow(textShadow);
      if (!parsedShadows) continue; // unparseable → skip (conservative)
    }

    // Bail out on visual effects that make contrast unreliable
    if (hasUnreliableVisualEffects(el)) continue;

    // Skip elements where a pseudo-element provides a visual background
    if (hasPseudoElementBackground(el)) continue;

    const fg = parseColor(style.color);
    if (!fg) continue;

    // Extract foreground alpha
    const fgAlpha = parseColorAlpha(style.color);
    if (fgAlpha === 0) continue;

    // Skip text that may be visually overlaid on an image/video element
    if (mayBeOverImage(el)) continue;

    const threshold = level === "AAA" ? (isLargeText(el) ? 4.5 : 7) : isLargeText(el) ? 3 : 4.5;

    let bg = getEffectiveBackgroundColor(el);

    // If no solid background found, check ancestor chain for gradient backgrounds
    if (!bg) {
      // Gradient + text-shadow is too complex — skip
      if (parsedShadows) continue;
      const gradientInfo = findAncestorGradient(el);
      if (gradientInfo) {
        const parentBg = gradientInfo.gradientEl.parentElement
          ? getEffectiveBackgroundColor(gradientInfo.gradientEl.parentElement)
          : null;
        const violation = checkGradientContrast(
          el,
          fg,
          fgAlpha,
          accumulatedOpacity,
          threshold,
          ruleId,
          level,
          gradientInfo.bgImage,
          parentBg ?? [255, 255, 255],
        );
        if (violation) violations.push(violation);
      }
      continue;
    }

    // Composite semi-transparent foreground over background
    let effectiveFg = fg;
    if (fgAlpha < 1) {
      effectiveFg = compositeColors(fg, bg, fgAlpha);
    }

    // Factor in element opacity: composite effective fg over bg at given opacity
    if (accumulatedOpacity < 1) {
      effectiveFg = compositeColors(effectiveFg, bg, accumulatedOpacity);
    }

    const fgLum = getLuminance(effectiveFg[0], effectiveFg[1], effectiveFg[2]);
    const bgLum = getLuminance(bg[0], bg[1], bg[2]);
    const ratio = parsedShadows
      ? getContrastWithShadow(effectiveFg, bg, parsedShadows)
      : getContrastRatio(fgLum, bgLum);

    if (ratio < threshold) {
      const roundedRatio = Math.round(ratio * 100) / 100;
      const fgHex = rgbToHex(effectiveFg);
      const bgHex = rgbToHex(bg);
      violations.push({
        ruleId,
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "serious" as const,
        message: `Insufficient${level === "AAA" ? " enhanced" : ""} color contrast ratio of ${roundedRatio}:1 (required ${threshold}:1).`,
        context: `foreground: ${fgHex} rgb(${effectiveFg.join(", ")}), background: ${bgHex} rgb(${bg.join(", ")}), ratio: ${roundedRatio}:1, required: ${threshold}:1`,
        fix: {
          type: "suggest" as const,
          suggestion: `Change the text color or background color so the contrast ratio meets ${threshold}:1. Current foreground is ${fgHex}, background is ${bgHex}.`,
        },
      });
    }
  }

  return violations;
}
