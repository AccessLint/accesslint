/**
 * Resilient, human-readable locators that survive DOM refactors.
 *
 * Mirrors the priority order of Playwright's `locator.normalize()` —
 * test id, then ARIA role + accessible name, then text — falling back to
 * the positional CSS path from `getSelector()` only when no user-facing
 * handle exists. The result is a Playwright source-form string, e.g.
 * `getByRole('button', { name: 'Submit' })`.
 *
 * This string is the *stable identity* used for snapshot/ratchet matching
 * and for display. It is deliberately NOT required to be re-resolvable or
 * unique: live resolution still uses the CSS `selector`, and the diff
 * engine matches duplicates by count, so a shared `getByRole(...)` across
 * several "Delete" buttons is correct (and far more stable than a
 * positional `nth-of-type` chain).
 */

import { getComputedRole, getAccessibleName } from "./aria";
import { getSelector } from "./selector";

/** Playwright's default `testIdAttribute`. Other test attrs fall through to the CSS floor. */
const TEST_ID_ATTR = "data-testid";

/** Roles that carry no targeting value — skip them and fall through. */
const SKIP_ROLES = new Set(["presentation", "none", "generic"]);

/** Longest text content we'll inline into a `getByText(...)` locator. */
const MAX_TEXT_LEN = 80;

/** Escape a string for a single-quoted JS string literal (Playwright getBy* style). */
function quote(s: string): string {
  return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, "\\n") + "'";
}

/** Collapse internal whitespace and trim, matching accessible-name comparison. */
function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Build the resilient locator segment for an element within its own root,
 * or null when the element offers no stable user-facing handle (caller
 * falls back to the CSS path).
 */
function buildResilientSegment(el: Element): string | null {
  // 1. data-testid — Playwright's most resilient locator.
  const testId = el.getAttribute(TEST_ID_ATTR);
  if (testId && testId.length > 0 && testId.length < 100) {
    return `getByTestId(${quote(testId)})`;
  }

  // 2. ARIA role + accessible name — closest to how users/AT perceive it.
  const role = getComputedRole(el);
  if (role && !SKIP_ROLES.has(role)) {
    const name = normalizeText(getAccessibleName(el));
    return name
      ? `getByRole(${quote(role)}, { name: ${quote(name)} })`
      : `getByRole(${quote(role)})`;
  }

  // 3. Short text content on a leaf — for non-interactive elements.
  if (el.children.length === 0) {
    const text = normalizeText(el.textContent ?? "");
    if (text && text.length <= MAX_TEXT_LEN) return `getByText(${quote(text)})`;
  }

  return null;
}

/**
 * Generate a stable, human-readable locator for an element. See file header.
 */
export function getResilientLocator(el: Element): string {
  // Shadow DOM / iframe elements defer to the CSS path, which already
  // crosses those boundaries. (Playwright's normalize() can't pierce shadow
  // either; this keeps a single boundary-aware code path.)
  const root = el.getRootNode();
  const inShadow = typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot;
  const inIframe = !inShadow && !!(root as Document).defaultView?.frameElement;
  if (inShadow || inIframe) return getSelector(el);

  return buildResilientSegment(el) ?? getSelector(el);
}
