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

/** Build a CSS segment for one element using stable attributes when available. */
function buildSegment(el: Element): string {
  const tag = el.tagName.toLowerCase();
  for (const attr of ANCHOR_ATTRS) {
    const val = el.getAttribute(attr);
    if (val != null && val.length > 0 && val.length < 100) {
      return `${tag}[${attr}="${escapeAttrVal(val)}"]`;
    }
  }
  const parent = el.parentElement;
  if (parent) {
    let count = 0;
    let index = 0;
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children[i].tagName === el.tagName) {
        count++;
        if (parent.children[i] === el) index = count;
      }
    }
    if (count > 1) {
      return `${tag}:nth-of-type(${index})`;
    }
  }
  return tag;
}

/** Build a selector within a single root (document or shadow root). */
function buildSelectorWithinRoot(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const root = el.getRootNode() as Document | ShadowRoot;
  const docEl = root instanceof ShadowRoot ? null : (root as Document).documentElement;

  // The document element itself — just use its tag name (unique by definition)
  if (el === docEl) return el.tagName.toLowerCase();

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== docEl) {
    // Anchor to nearest ancestor with an ID
    if (current !== el && current.id) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }

    parts.unshift(buildSegment(current));

    // Stop early when the selector already uniquely identifies the target
    if (parts.length >= 2) {
      const candidate = parts.join(" > ");
      try {
        const matches = root.querySelectorAll(candidate);
        if (matches.length === 1 && matches[0] === el) return candidate;
      } catch {
        /* invalid selector, keep building */
      }
    }

    current = current.parentElement;
  }

  return parts.join(" > ");
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
