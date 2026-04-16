import { getCachedComputedStyle } from "./color";

/**
 * Filter functions and their identity (no-op) values.  A CSS filter is a
 * no-op when every function evaluates to its identity value.  Dark-mode
 * plugins commonly set `filter: grayscale(0)` on `<html>` as a toggle
 * hook — this must not cause us to skip contrast checking.
 *
 * Identity = 0: grayscale, blur, hue-rotate, invert, sepia
 * Identity = 1: brightness, contrast, saturate, opacity
 */
const FILTER_IDENTITY: Record<string, number> = {
  grayscale: 0, blur: 0, "hue-rotate": 0, invert: 0, sepia: 0,
  brightness: 1, contrast: 1, saturate: 1, opacity: 1,
};

function parseFilterArg(arg: string): number {
  const num = parseFloat(arg);
  if (isNaN(num)) return NaN;
  // Percentage values: 100% → 1, 0% → 0
  return arg.trim().endsWith("%") ? num / 100 : num;
}

const FILTER_FN_RE = /([a-z-]+)\(([^)]*)\)/g;

function isNoopFilter(value: string): boolean {
  let match: RegExpExecArray | null;
  let matched = false;
  FILTER_FN_RE.lastIndex = 0;
  while ((match = FILTER_FN_RE.exec(value))) {
    matched = true;
    const identity = FILTER_IDENTITY[match[1]];
    if (identity === undefined) return false; // unknown function (e.g. url(), drop-shadow())
    if (parseFilterArg(match[2]) !== identity) return false;
  }
  return matched;
}

/**
 * Returns true when any ancestor uses visual effects that make
 * contrast unreliable to compute (filter, mix-blend-mode, backdrop-filter).
 */
export function hasUnreliableVisualEffects(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    const style = getCachedComputedStyle(current);
    const filter = style.filter;
    if (filter && filter !== "none" && filter !== "initial" && !isNoopFilter(filter)) return true;
    const blendMode = style.mixBlendMode;
    if (blendMode && blendMode !== "normal" && blendMode !== "initial") return true;
    const backdrop = style.backdropFilter;
    if (backdrop && backdrop !== "none" && backdrop !== "initial" && !isNoopFilter(backdrop)) return true;
    current = current.parentElement;
  }
  return false;
}
