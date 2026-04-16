import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { FOCUSABLE_SELECTOR } from "../utils/aria";

/**
 * Check if an element is actually visible and reachable in the current state.
 * Elements in closed modals/menus often have aria-hidden on the container
 * but are also hidden via display:none or visibility:hidden. These are not
 * truly focusable and should not be flagged.
 */
function isActuallyVisible(el: HTMLElement): boolean {
  let current: HTMLElement | null = el;
  const doc = el.ownerDocument;
  const view = doc.defaultView;
  while (current && current !== doc.body) {
    // Check inline styles first (fast path)
    if (current.style.display === "none") return false;
    if (current.style.visibility === "hidden") return false;
    // Check computed styles if view is available
    if (view) {
      const computed = view.getComputedStyle(current);
      if (computed.display === "none") return false;
      if (computed.visibility === "hidden") return false;
    }
    current = current.parentElement;
  }
  return true;
}


/**
 * Detect focus sentinel pattern: an off-screen element whose focus is
 * redirected via a script (e.g. `getElementById('id').addEventListener('focus', ...)`
 * that calls `.focus()` on another element). We check both positioning and
 * script content because off-screen alone doesn't indicate a sentinel.
 */
function isFocusSentinel(el: HTMLElement): boolean {
  // Must be off-screen
  const view = el.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(el);
  const position = style.position;
  if (position !== "absolute" && position !== "fixed") return false;
  const top = parseFloat(style.top);
  const left = parseFloat(style.left);
  const offScreen = (!isNaN(top) && top < -500) || (!isNaN(left) && left < -500);
  if (!offScreen) return false;

  // Must have a focus redirect: check scripts for addEventListener('focus',...)
  // on this element that calls .focus()
  const id = el.id;
  if (!id) return false;
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `getElementById\\s*\\(\\s*['"]${escapedId}['"]\\s*\\)\\s*\\.\\s*addEventListener\\s*\\(\\s*['"]focus['"]`,
  );
  for (const script of el.ownerDocument.querySelectorAll("script")) {
    const text = script.textContent || "";
    if (pattern.test(text) && /\.focus\s*\(/.test(text)) return true;
  }
  return false;
}

export const ariaHiddenFocus: Rule = {
  id: "aria/aria-hidden-focus",
  category: "aria",
  actRuleIds: ["6cfa84"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "Elements with aria-hidden='true' must not contain focusable elements.",
  guidance: "When aria-hidden='true' hides an element from assistive technologies but the element contains focusable children, keyboard users can focus those children but screen reader users won't know they exist. Either remove focusable elements from the hidden region, add tabindex='-1' to them, or remove aria-hidden.",
  run(doc) {
    const violations = [];

    for (const hidden of doc.querySelectorAll('[aria-hidden="true"]')) {
      // Skip if it's the body (handled by aria-hidden-body)
      if (hidden === doc.body) continue;

      // Collect focusable elements: both descendants and the element itself
      const candidates: Element[] = [...hidden.querySelectorAll(FOCUSABLE_SELECTOR)];
      if (hidden.matches(FOCUSABLE_SELECTOR)) candidates.push(hidden);

      for (const el of candidates) {
        // Check if element is actually focusable (not disabled, not hidden)
        if (el instanceof HTMLElement) {
          // Skip elements with tabindex="-1" as they're not in tab order
          const tabindex = el.getAttribute("tabindex");
          if (tabindex === "-1") continue;

          // Skip disabled elements
          if ((el as HTMLButtonElement | HTMLInputElement).disabled) continue;

          // Skip hidden inputs
          if (el instanceof HTMLInputElement && el.type === "hidden") continue;

          // Skip elements that are not actually visible/reachable — common
          // pattern: modals/menus closed with aria-hidden that also hide
          // content via display:none or visibility:hidden.
          if (!isActuallyVisible(el)) continue;

          // Focus sentinel pattern: skip elements positioned off-screen
          // (e.g. position:absolute; top:-999em) or with onfocus handlers
          // that redirect focus. These are used in modal dialog patterns
          // to wrap keyboard focus and are not real focus traps.
          const onfocus = el.getAttribute("onfocus") || "";
          if (/\.focus\s*\(/.test(onfocus)) continue;
          if (isFocusSentinel(el)) continue;

          // Determine why this element is focusable
          const tag = el.tagName.toLowerCase();
          let reason: string;
          if (tabindex !== null) reason = `has tabindex="${tabindex}"`;
          else if (tag === "a" && el.hasAttribute("href")) reason = "is a link with href";
          else if (tag === "button") reason = "is a <button>";
          else if (tag === "input") reason = `is an <input type="${(el as HTMLInputElement).type}">`;
          else if (tag === "select") reason = "is a <select>";
          else if (tag === "textarea") reason = "is a <textarea>";
          else if (tag === "iframe") reason = "is an <iframe>";
          else reason = `is a natively focusable <${tag}>`;

          // Find the aria-hidden ancestor
          const hiddenAncestor = el === hidden ? el : el.closest('[aria-hidden="true"]');

          violations.push({
            ruleId: "aria/aria-hidden-focus",
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "serious" as const,
            message: "Focusable element is inside an aria-hidden region.",
            context: `Focusable because: ${reason}. aria-hidden ancestor: ${hiddenAncestor ? getHtmlSnippet(hiddenAncestor) : "unknown"}`,
            fix: { type: "suggest", suggestion: "Add tabindex=\"-1\" to remove from tab order, or move the element outside the aria-hidden region" } as const,
          });
        }
      }
    }

    return violations;
  },
};
