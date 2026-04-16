let _computedStyleCache = new WeakMap<Element, CSSStyleDeclaration>();
let _effectiveBgCache = new WeakMap<Element, [number, number, number] | null>();
let _overImageCache = new WeakMap<Element, boolean>();
// null = not yet tested; real browsers return 'none', jsdom returns '' (not implemented)
let _pseudoElementStylesSupported: boolean | null = null;

function supportsPseudoElementStyles(): boolean {
  if (_pseudoElementStylesSupported !== null) return _pseudoElementStylesSupported;
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") {
    return (_pseudoElementStylesSupported = false);
  }
  const div = document.createElement("div");
  _pseudoElementStylesSupported = getComputedStyle(div, "::before").content !== "";
  return _pseudoElementStylesSupported;
}

export function clearColorCaches(): void {
  _computedStyleCache = new WeakMap();
  _effectiveBgCache = new WeakMap();
  _overImageCache = new WeakMap();
}

export function getCachedComputedStyle(el: Element): CSSStyleDeclaration {
  let style = _computedStyleCache.get(el);
  if (style) return style;
  style = getComputedStyle(el);
  _computedStyleCache.set(el, style);
  return style;
}

export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0],
  green: [0, 128, 0], blue: [0, 0, 255], yellow: [255, 255, 0],
  orange: [255, 165, 0], purple: [128, 0, 128], gray: [128, 128, 128],
  grey: [128, 128, 128], silver: [192, 192, 192], maroon: [128, 0, 0],
  navy: [0, 0, 128], teal: [0, 128, 128], aqua: [0, 255, 255],
  fuchsia: [255, 0, 255], lime: [0, 255, 0], olive: [128, 128, 0],
};

export function parseColor(color: string): [number, number, number] | null {
  const trimmed = color.trim().toLowerCase();

  // Named colors
  if (NAMED_COLORS[trimmed]) return NAMED_COLORS[trimmed];

  // Hex: #RGB, #RRGGBB
  const hex3 = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) {
    return [parseInt(hex3[1] + hex3[1], 16), parseInt(hex3[2] + hex3[2], 16), parseInt(hex3[3] + hex3[3], 16)];
  }
  const hex6 = trimmed.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
  if (hex6) {
    return [parseInt(hex6[1], 16), parseInt(hex6[2], 16), parseInt(hex6[3], 16)];
  }

  // Legacy comma-separated: rgb(r, g, b) / rgba(r, g, b, a)
  const comma = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/
  );
  if (comma) {
    return [parseInt(comma[1]), parseInt(comma[2]), parseInt(comma[3])];
  }
  // Modern space-separated (CSS Color Level 4): rgb(r g b) / rgb(r g b / a)
  const space = color.match(
    /rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*[\d.]+%?)?\s*\)/
  );
  if (space) {
    return [parseInt(space[1]), parseInt(space[2]), parseInt(space[3])];
  }
  return null;
}

/**
 * Extract the alpha channel from a CSS color string.
 * Returns 1.0 if no alpha is specified.
 */
export function parseColorAlpha(color: string): number {
  // Legacy: rgba(r, g, b, a)
  const legacy = color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  if (legacy) return parseFloat(legacy[1]);
  // Modern: rgb(r g b / a) or rgba(r g b / a)
  const modern = color.match(/rgba?\([^)]+\/\s*([\d.]+%?)\s*\)/);
  if (modern) {
    const val = modern[1];
    return val.endsWith("%") ? parseFloat(val) / 100 : parseFloat(val);
  }
  return 1.0;
}

/**
 * Composite a semi-transparent foreground color over an opaque background.
 * Returns the resulting opaque RGB color.
 */
export function compositeColors(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ];
}

export function getEffectiveBackgroundColor(el: Element): [number, number, number] | null {
  const cached = _effectiveBgCache.get(el);
  if (cached !== undefined) return cached;

  const result = _computeEffectiveBg(el);
  _effectiveBgCache.set(el, result);
  return result;
}

/**
 * Composite a stack of semi-transparent layers (outermost first) over a base color.
 */
function _compositeStack(
  layers: { color: [number, number, number]; alpha: number }[],
  base: [number, number, number],
): [number, number, number] {
  let result = base;
  // Apply layers from outermost (bottom of stack) to innermost (top of stack)
  for (let i = layers.length - 1; i >= 0; i--) {
    result = compositeColors(layers[i].color, result, layers[i].alpha);
  }
  return result;
}

function _computeEffectiveBg(el: Element): [number, number, number] | null {
  const layers: { color: [number, number, number]; alpha: number }[] = [];
  let current: Element | null = el;

  while (current) {
    const style = getCachedComputedStyle(current);
    const bgImg = style.backgroundImage;
    if (bgImg && bgImg !== "none" && bgImg !== "initial") {
      // Background image found — composite accumulated layers over
      // the solid backgroundColor if available, otherwise return null.
      const bg = style.backgroundColor;
      if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)" && bg !== "rgba(0 0 0 / 0)") {
        const base = parseColor(bg);
        if (base) {
          return layers.length > 0 ? _compositeStack(layers, base) : base;
        }
      }
      return null;
    }
    const bg = style.backgroundColor;
    // Skip fully transparent
    if (bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || bg === "rgba(0 0 0 / 0)") {
      current = current.parentElement;
      continue;
    }
    const alpha = parseColorAlpha(bg);
    // Skip nearly transparent (< 1% opacity)
    if (alpha < 0.01) {
      current = current.parentElement;
      continue;
    }
    const color = parseColor(bg);
    if (!color) {
      current = current.parentElement;
      continue;
    }
    // Opaque background — composite any accumulated layers over it and return
    if (alpha >= 1) {
      return layers.length > 0 ? _compositeStack(layers, color) : color;
    }
    // Semi-transparent — accumulate for compositing
    layers.push({ color, alpha });
    current = current.parentElement;
  }
  // Default to white; composite any accumulated layers over it
  const white: [number, number, number] = [255, 255, 255];
  return layers.length > 0 ? _compositeStack(layers, white) : white;
}

/**
 * Split a string by commas, respecting parentheses.
 * e.g. "to right, rgb(255, 0, 0), blue 50%" → ["to right", "rgb(255, 0, 0)", "blue 50%"]
 */
export function splitByComma(content: string): string[] {
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "(") depth++;
    else if (content[i] === ")") depth--;
    else if (content[i] === "," && depth === 0) {
      segments.push(content.slice(start, i).trim());
      start = i + 1;
    }
  }
  segments.push(content.slice(start).trim());
  return segments;
}

/**
 * Extract color stops from a CSS gradient value.
 * Returns parsed RGB colors for each stop, skipping positions/angles.
 * For "transparent", uses the provided fallback color (defaults to white).
 */
export function parseGradientStops(
  bgImage: string,
  transparentFallback: [number, number, number] = [255, 255, 255],
): [number, number, number][] {
  const colors: [number, number, number][] = [];
  // Match the outermost gradient function — use balanced parens matching
  const gradIdx = bgImage.search(/(?:linear|radial|conic)-gradient\(/);
  if (gradIdx === -1) return colors;
  const openParen = bgImage.indexOf("(", gradIdx);
  if (openParen === -1) return colors;
  // Find matching close paren
  let depth = 1;
  let i = openParen + 1;
  for (; i < bgImage.length && depth > 0; i++) {
    if (bgImage[i] === "(") depth++;
    else if (bgImage[i] === ")") depth--;
  }
  const content = bgImage.slice(openParen + 1, i - 1);

  const segments = splitByComma(content);
  for (const seg of segments) {
    const trimmed = seg.trim();
    // Skip direction tokens like "to right", "90deg", etc.
    if (/^(to\s|[\d.]+deg|[\d.]+turn|[\d.]+rad)/i.test(trimmed)) continue;

    // Handle "transparent" keyword
    if (trimmed === "transparent" || trimmed.startsWith("transparent ")) {
      colors.push(transparentFallback);
      continue;
    }

    // Try parsing the full segment as a color (for simple colors like "black")
    // or just the color part (before position like "3.3em" or "50%")
    const colorPart = trimmed.replace(/\s+[\d.]+(%|em|px|rem|vh|vw).*$/i, "").trim();
    const parsed = parseColor(colorPart);
    if (parsed) colors.push(parsed);
  }
  return colors;
}

const MEDIA_TAGS = new Set(["IMG", "PICTURE", "VIDEO", "SVG"]);

/**
 * Detects whether text may be visually overlaid on an image via CSS
 * positioning. Checks sibling branches for media elements (<img>, <picture>,
 * <video>, <svg>) — including those nested inside wrapper divs — and for
 * positioned siblings with CSS background-image. Returns true when either
 * the text or a sibling visual element is positioned out of normal flow
 * within a shared positioning context — the common hero/card overlay pattern.
 */
export function mayBeOverImage(el: Element): boolean {
  const cached = _overImageCache.get(el);
  if (cached !== undefined) return cached;
  const result = _checkOverImage(el);
  _overImageCache.set(el, result);
  return result;
}

function _hasMedia(child: Element): boolean {
  if (MEDIA_TAGS.has(child.tagName)) return true;
  return !!child.querySelector("img, picture, video, svg");
}

function _checkOverImage(el: Element): boolean {
  let current: Element | null = el;
  let textIsOutOfFlow = false;

  while (current) {
    const pos = getCachedComputedStyle(current).position;

    if (pos === "absolute" || pos === "fixed") {
      textIsOutOfFlow = true;
    }

    // At a positioning context, check sibling branches for visual backgrounds
    if (current !== el && pos !== "static") {
      for (const child of current.children) {
        if (child === el || child.contains(el)) continue;
        // Media element (direct or nested in wrapper div)
        if (_hasMedia(child)) {
          if (textIsOutOfFlow) return true;
          const childPos = getCachedComputedStyle(child).position;
          if (childPos === "absolute" || childPos === "fixed") return true;
        }
        // Positioned sibling with CSS background-image (hero/card backdrop pattern)
        const childStyle = getCachedComputedStyle(child);
        if (childStyle.position === "absolute" || childStyle.position === "fixed") {
          const bgImg = childStyle.backgroundImage;
          if (bgImg && bgImg !== "none" && bgImg !== "initial") return true;
        }
      }
      // Only check the nearest positioning context for the text
      if (textIsOutOfFlow) break;
    }

    current = current.parentElement;
  }
  return false;
}

/** Convert a CSS font-size value to pixels. Handles px and pt units. */
function fontSizeToPx(raw: string): number {
  const value = parseFloat(raw);
  if (raw.endsWith("pt")) return value * (4 / 3); // 1pt = 4/3 px
  return value; // px or unitless
}

export function isLargeText(el: Element): boolean {
  const style = getCachedComputedStyle(el);
  const fontSizePx = fontSizeToPx(style.fontSize);
  const fontWeight = parseInt(style.fontWeight) || (style.fontWeight === "bold" ? 700 : 400);
  // Large text: >= 18pt (24px) or >= 14pt (18.66px) bold.
  // Use small tolerance (0.5px) for DOM environments with imprecise pt→px conversion.
  return fontSizePx >= 23.5 || (fontSizePx >= 18.5 && fontWeight >= 700);
}

export interface TextShadow {
  color: [number, number, number];
  blur: number;
}

/**
 * Parse a CSS text-shadow value into structured shadow objects.
 * Computed styles always use rgb()/rgba() format.
 * Returns null if any shadow is unparseable.
 */
export function parseTextShadow(textShadow: string): TextShadow[] | null {
  const parts = splitByComma(textShadow);
  const shadows: TextShadow[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Extract rgb()/rgba() color
    const colorMatch = trimmed.match(/rgba?\([^)]+\)/);
    const color = colorMatch ? parseColor(colorMatch[0]) : null;
    if (!color) return null;
    // Extract px lengths (offset-x, offset-y, optional blur)
    const lengths = trimmed.replace(/rgba?\([^)]+\)/, "").match(/[\d.]+px/g);
    const blur = lengths && lengths.length >= 3 ? parseFloat(lengths[2]) : 0;
    shadows.push({ color, blur });
  }
  return shadows.length > 0 ? shadows : null;
}

function isTransparent(bg: string): boolean {
  return bg === "transparent" || bg === "rgba(0, 0, 0, 0)" || bg === "rgba(0 0 0 / 0)";
}

/**
 * Check if an element (or an ancestor up to the nearest opaque background)
 * has a ::before or ::after pseudo-element that provides a visual background.
 */
export function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute the effective contrast considering text shadows.
 * Uses the maximum of: fg-vs-bg, fg-vs-shadow, shadow-vs-bg for each shadow.
 */
export function getContrastWithShadow(
  fg: [number, number, number],
  bg: [number, number, number],
  shadows: TextShadow[],
): number {
  const fgLum = getLuminance(fg[0], fg[1], fg[2]);
  const bgLum = getLuminance(bg[0], bg[1], bg[2]);
  let best = getContrastRatio(fgLum, bgLum);
  for (const shadow of shadows) {
    const sLum = getLuminance(shadow.color[0], shadow.color[1], shadow.color[2]);
    best = Math.max(best, getContrastRatio(fgLum, sLum), getContrastRatio(sLum, bgLum));
  }
  return best;
}

/**
 * Walk up the tree and multiply opacity values.
 * Returns the accumulated opacity (0–1).
 */
export function getAccumulatedOpacity(el: Element): number {
  let opacity = 1;
  let current: Element | null = el;
  while (current) {
    const style = getCachedComputedStyle(current);
    const o = parseFloat(style.opacity);
    if (!isNaN(o)) opacity *= o;
    current = current.parentElement;
  }
  return opacity;
}

export function hasPseudoElementBackground(el: Element): boolean {
  if (!supportsPseudoElementStyles()) return false;
  let current: Element | null = el;
  while (current) {
    for (const pseudo of ["::before", "::after"] as const) {
      try {
        const ps = getComputedStyle(current, pseudo);
        const content = ps.content;
        // No pseudo-element if content is none/normal/empty
        if (!content || content === "none" || content === "normal" || content === '""') continue;
        // Check for non-transparent background color
        const bgColor = ps.backgroundColor;
        if (bgColor && !isTransparent(bgColor) && parseColorAlpha(bgColor) >= 0.1) return true;
        // Check for background image
        const bgImg = ps.backgroundImage;
        if (bgImg && bgImg !== "none" && bgImg !== "initial") return true;
        // Check for absolute/fixed positioning with meaningful dimensions
        const pos = ps.position;
        if (pos === "absolute" || pos === "fixed") {
          const w = parseFloat(ps.width);
          const h = parseFloat(ps.height);
          if (w > 1 && h > 1) return true;
        }
      } catch {
        // Some DOM-only environments don't support pseudo-element styles
      }
    }
    // Stop at the nearest opaque background ancestor
    const style = getCachedComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg && !isTransparent(bg) && parseColorAlpha(bg) >= 1) break;
    current = current.parentElement;
  }
  return false;
}
