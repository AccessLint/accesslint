import { isAriaHidden } from "./aria";
import { getCachedComputedStyle } from "./color";

export const NON_TEXT_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "CANVAS",
  "VIDEO",
  "AUDIO",
  "IMG",
  "BR",
  "HR",
]);

export function isVisuallyHidden(style: CSSStyleDeclaration): boolean {
  // Classic sr-only / visuallyhidden: clip: rect(0 0 0 0)
  // Computed format varies: "rect(0px, 0px, 0px, 0px)", "rect(0, 0, 0, 0)",
  // "rect(0 0 0 0)" — extract numbers and check all are zero.
  const clip = style.clip;
  if (clip && clip.startsWith("rect(")) {
    const nums = clip.match(/[\d.]+/g);
    if (!nums || nums.every((n) => parseFloat(n) === 0)) return true;
  }
  // Modern equivalent: clip-path: inset(50%) or inset(100%)
  const clipPath = style.clipPath;
  if (clipPath === "inset(50%)" || clipPath === "inset(100%)") return true;
  // Tiny box with overflow hidden (1px × 1px sr-only without clip)
  if (style.overflow === "hidden" && style.position === "absolute") {
    const w = parseFloat(style.width);
    const h = parseFloat(style.height);
    if (w <= 1 && h <= 1) return true;
  }
  return false;
}

export function isHidden(el: Element): boolean {
  if (isAriaHidden(el)) return true;
  let current: Element | null = el;
  while (current) {
    const style = getCachedComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") return true;
    if (isVisuallyHidden(style)) return true;
    current = current.parentElement;
  }
  return false;
}

export function isDisabledFormElement(el: Element): boolean {
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement
  ) {
    return el.disabled;
  }
  // fieldset[disabled] disables all descendants
  if (el.closest("fieldset[disabled]")) return true;
  // aria-disabled="true" on the element itself or an interactive role ancestor
  if (el.getAttribute("aria-disabled") === "true") return true;
  return false;
}

/** Check if a label's associated control is disabled. */
export function isLabelForDisabledControl(el: Element, doc: Document): boolean {
  if (el.tagName !== "LABEL") return false;
  const label = el as HTMLLabelElement;
  // Explicit for= association
  const forId = label.htmlFor;
  if (forId) {
    const target = doc.getElementById(forId);
    if (target && (
      (target as HTMLInputElement).disabled ||
      target.getAttribute("aria-disabled") === "true"
    )) return true;
  }
  // Implicit association (control nested inside label)
  const control = label.querySelector("input, select, textarea, button");
  if (control && (
    (control as HTMLInputElement).disabled ||
    control.getAttribute("aria-disabled") === "true"
  )) return true;
  // Label referencing an aria-disabled widget via for + aria-labelledby
  const id = label.id;
  if (id) {
    const referenced = doc.querySelector(`[aria-labelledby~="${id}"][aria-disabled="true"]`);
    if (referenced) return true;
  }
  return false;
}

/** Returns true when the element is inside a native <select>. */
export function isInsideNativeSelect(el: Element): boolean {
  return el.closest("select") !== null;
}

/** Returns true when text consists entirely of non-letter characters (symbols, punctuation). */
export function hasOnlyNonTextCharacters(text: string): boolean {
  // Strip whitespace, then check if any Unicode letter remains
  const stripped = text.replace(/\s/g, "");
  if (!stripped) return true;
  // \p{L} matches any Unicode letter
  return !/\p{L}/u.test(stripped);
}

/** Returns true when the element is inside an aria-disabled container. */
export function isInAriaDisabledGroup(el: Element): boolean {
  return el.closest('[aria-disabled="true"]') !== null;
}
