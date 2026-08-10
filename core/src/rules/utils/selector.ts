import { isStableId } from "./generated-id";

let _selectorCache = new WeakMap<Element, string>();

export function clearSelectorCache(): void {
  _selectorCache = new WeakMap();
}

/** Escape a string for use inside a CSS `[attr="value"]` selector. */
function escapeAttrVal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Attributes (in priority order) that help uniquely identify an element.
 * These tend to be stable across DOM mutations unlike positional indices.
 */
const ANCHOR_ATTRS = [
  "data-testid",
  "data-test-id",
  "data-cy",
  "data-id",
  "name",
  "href",
  "for",
  "aria-label",
];

/**
 * Return the strongest stable anchor for an element, formatted as
 * `attr=value` (e.g. `data-testid=submit`), or null if no anchor is
 * present. Priority matches ANCHOR_ATTRS with `id` considered ahead of
 * the rest when present. Used by snapshot matchers to identify an
 * element across DOM refactors.
 */
export function extractAnchor(el: Element): string | null {
  if (isStableId(el.id)) {
    return `id=${el.id}`;
  }
  for (const attr of ANCHOR_ATTRS) {
    const val = el.getAttribute(attr);
    if (val != null && val.length > 0 && val.length < 100) {
      return `${attr}=${val}`;
    }
  }
  return null;
}

/** 1-based `:nth-of-type()` index of `el`, or null when it is the only one of its tag. */
function nthOfTypeIndex(el: Element): number | null {
  const parent = el.parentElement;
  if (!parent) return null;
  let count = 0;
  let index = 0;
  for (let i = 0; i < parent.children.length; i++) {
    if (parent.children[i].tagName === el.tagName) {
      count++;
      if (parent.children[i] === el) index = count;
    }
  }
  return count > 1 ? index : null;
}

/**
 * Build a CSS segment for one element using stable attributes when available.
 * `positional` also pins an anchor-attribute segment to its `:nth-of-type()`
 * index, for the second pass over elements whose siblings share the value.
 */
function buildSegment(el: Element, positional: boolean): string {
  const tag = el.tagName.toLowerCase();
  for (const attr of ANCHOR_ATTRS) {
    const val = el.getAttribute(attr);
    if (val != null && val.length > 0 && val.length < 100) {
      const segment = `${tag}[${attr}="${escapeAttrVal(val)}"]`;
      const index = positional ? nthOfTypeIndex(el) : null;
      return index === null ? segment : `${segment}:nth-of-type(${index})`;
    }
  }
  const index = nthOfTypeIndex(el);
  return index === null ? tag : `${tag}:nth-of-type(${index})`;
}

function resolvesTo(root: Document | ShadowRoot, selector: string, el: Element): boolean {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === el;
  } catch {
    return false; // invalid selector
  }
}

/**
 * Walk from `el` up to `docEl` accumulating segments, stopping as soon as the
 * accumulated path resolves to `el` alone. `unique` reports whether it does —
 * a path that reaches the top still ambiguous comes back false.
 */
function buildPath(
  el: Element,
  root: Document | ShadowRoot,
  docEl: Element | null,
  positional: boolean,
): { selector: string; unique: boolean } {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== docEl) {
    // Anchor to nearest ancestor with a stable ID
    if (current !== el && isStableId(current.id)) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    parts.unshift(buildSegment(current, positional));

    // Stop early when the selector already uniquely identifies the target
    if (parts.length >= 2) {
      const candidate = parts.join(" > ");
      if (resolvesTo(root, candidate, el)) return { selector: candidate, unique: true };
    }

    current = current.parentElement;
  }

  const selector = parts.join(" > ");
  return { selector, unique: resolvesTo(root, selector, el) };
}

/** Build a selector within a single root (document or shadow root). */
function buildSelectorWithinRoot(el: Element): string {
  if (isStableId(el.id)) return `#${CSS.escape(el.id)}`;

  const root = el.getRootNode() as Document | ShadowRoot;
  const docEl = root instanceof ShadowRoot ? null : (root as Document).documentElement;

  // The document element itself — just use its tag name (unique by definition)
  if (el === docEl) return el.tagName.toLowerCase();

  const attrPath = buildPath(el, root, docEl, false);
  if (attrPath.unique) return attrPath.selector;

  // Siblings share an anchor value (a radio group's `name`, repeated
  // `aria-label`s), so the attribute path names more than one element. Retry
  // pinning those segments positionally. Only paths that were already broken
  // reach here, which keeps stable paths off the brittle positional form.
  return buildPath(el, root, docEl, true).selector;
}

/**
 * Generate a CSS selector for an element.
 * If the element is inside a shadow root, produces a ` >>> `-delimited
 * path that crosses shadow boundaries: `host-selector >>> inner-selector`.
 * If the element is inside an iframe, produces a ` >>>iframe> `-delimited
 * path that crosses iframe boundaries: `iframe-selector >>>iframe> inner-selector`.
 */
export function getSelector(el: Element): string {
  const cached = _selectorCache.get(el);
  if (cached !== undefined) return cached;

  const parts: { selector: string; delimiter: string }[] = [];
  let current: Element | null = el;

  while (current) {
    const root = current.getRootNode();

    if (root instanceof ShadowRoot) {
      parts.unshift({ selector: buildSelectorWithinRoot(current), delimiter: " >>> " });
      current = root.host;
    } else {
      // Check if we're inside an iframe
      const frameElement = (root as Document).defaultView?.frameElement as Element | null;
      if (frameElement) {
        parts.unshift({ selector: buildSelectorWithinRoot(current), delimiter: " >>>iframe> " });
        current = frameElement;
      } else {
        parts.unshift({ selector: buildSelectorWithinRoot(current), delimiter: "" });
        break;
      }
    }
  }

  const result = parts.map((p, i) => (i === 0 ? "" : p.delimiter) + p.selector).join("");
  _selectorCache.set(el, result);
  return result;
}

/**
 * Resolve a selector that may contain ` >>> ` (shadow DOM) or
 * ` >>>iframe> ` (iframe) boundary delimiters.
 * Falls back to plain querySelector for selectors without boundaries.
 */
export function querySelectorShadowAware(selector: string): Element | null {
  // Split on boundary delimiters, tracking the boundary type after each segment.
  // ` >>>iframe> ` must be checked before ` >>> ` to avoid partial matches.
  const segments: string[] = [];
  const boundaries: ("shadow" | "iframe")[] = [];
  let remaining = selector;

  while (remaining) {
    const iframeIdx = remaining.indexOf(" >>>iframe> ");
    const shadowIdx = remaining.indexOf(" >>> ");

    // Find the earliest delimiter (prefer iframe if at same position)
    if (iframeIdx !== -1 && (shadowIdx === -1 || iframeIdx <= shadowIdx)) {
      segments.push(remaining.slice(0, iframeIdx).trim());
      boundaries.push("iframe");
      remaining = remaining.slice(iframeIdx + " >>>iframe> ".length);
    } else if (shadowIdx !== -1) {
      segments.push(remaining.slice(0, shadowIdx).trim());
      boundaries.push("shadow");
      remaining = remaining.slice(shadowIdx + " >>> ".length);
    } else {
      segments.push(remaining.trim());
      break;
    }
  }

  let root: { querySelector(s: string): Element | null } = document;

  for (let i = 0; i < segments.length; i++) {
    const el = root.querySelector(segments[i]);
    if (!el) return null;

    if (i < segments.length - 1) {
      if (boundaries[i] === "iframe") {
        const contentDoc = (el as HTMLIFrameElement).contentDocument;
        if (!contentDoc) return null;
        root = contentDoc;
      } else {
        const shadow = el.shadowRoot;
        if (!shadow) return null;
        root = shadow;
      }
    } else {
      return el;
    }
  }

  return null;
}

export function getHtmlSnippet(el: Element): string {
  const html = el.outerHTML;
  return html.length > 200 ? html.slice(0, 200) + "..." : html;
}

const LANDMARK_TAGS = new Set(["main", "nav", "header", "footer", "aside", "form"]);
const LANDMARK_ROLES = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "form",
  "main",
  "navigation",
  "region",
  "search",
]);

function isLandmark(el: Element): boolean {
  if (LANDMARK_TAGS.has(el.tagName.toLowerCase())) return true;
  const explicit = el.getAttribute("role");
  return explicit != null && LANDMARK_ROLES.has(explicit);
}

function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (isStableId(el.id)) return `${tag}#${el.id}`;
  const role = el.getAttribute("role");
  return role ? `${tag}[role=${role}]` : tag;
}

const LANDMARK_WALK_LIMIT = 6;

/**
 * Produce a short, wrapper-invariant trail describing where an element lives
 * on the page. Combines the nearest landmark ancestor, an intermediate
 * id/role-bearing ancestor, and the nearest short sibling text.
 *
 * Example: `main > form#login > near "Email"`.
 *
 * Returns null when no landmark is found within LANDMARK_WALK_LIMIT ancestors
 * so callers can degrade gracefully on poorly-structured pages.
 */
export function buildRelativeLocation(el: Element): string | null {
  const between: Element[] = [];
  let current: Element | null = el.parentElement;
  let landmark: Element | null = null;
  for (let depth = 0; current && depth < LANDMARK_WALK_LIMIT; depth++) {
    if (isLandmark(current)) {
      landmark = current;
      break;
    }
    between.push(current);
    current = current.parentElement;
  }
  if (!landmark) return null;

  const trail: string[] = [segmentFor(landmark)];

  for (const ancestor of between) {
    if (isStableId(ancestor.id) || ancestor.getAttribute("role")) {
      trail.push(segmentFor(ancestor));
      break;
    }
  }

  const nearText = findNearestShortText(el);
  if (nearText) trail.push(`near "${nearText}"`);

  return trail.join(" > ");
}

function findNearestShortText(el: Element): string | null {
  let current: Element | null = el;
  for (let depth = 0; current && depth < 4; depth++, current = current.parentElement) {
    for (let i = 0; i < current.children.length; i++) {
      const sibling = current.children[i];
      if (sibling === el) continue;
      const text = (sibling.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 0 && text.length <= 40) return text;
    }
  }
  return null;
}
