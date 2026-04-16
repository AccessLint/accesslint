// ---------------------------------------------------------------------------
// Focusable element selector
// ---------------------------------------------------------------------------

/** Elements that are natively focusable (comprehensive list). */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  'details > summary:first-of-type',
  'iframe',
  'object',
  'embed',
  'area[href]',
].join(", ");

// ---------------------------------------------------------------------------
// Computed role
// ---------------------------------------------------------------------------

let _computedRoleCache = new WeakMap<Element, string | null>();

export function clearComputedRoleCache(): void {
  _computedRoleCache = new WeakMap();
}

/**
 * Return the implicit ARIA role for a native HTML element, or null if
 * the element does not map to any role.  Follows the ARIA in HTML spec:
 * https://www.w3.org/TR/html-aria/#docconformance
 */
export function getImplicitRole(el: Element): string | null {
  const tagName = el.tagName.toLowerCase();
  const type = el.getAttribute("type")?.toLowerCase();

  switch (tagName) {
    case "a": return el.hasAttribute("href") ? "link" : null;
    case "area": return el.hasAttribute("href") ? "link" : null;
    case "article": return "article";
    case "aside": return "complementary";
    case "button": return "button";
    case "datalist": return "listbox";
    case "details": return "group";
    case "dialog": return "dialog";
    case "fieldset": return "group";
    case "figure": return "figure";
    case "footer": return el.closest("article, aside, main, nav, section") ? null : "contentinfo";
    case "form": return "form";
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": return "heading";
    case "header": return el.closest("article, aside, main, nav, section") ? null : "banner";
    case "hr": return "separator";
    case "img": return el.getAttribute("alt") === "" ? "presentation" : "img";
    case "input":
      switch (type) {
        case "button": case "image": case "reset": case "submit": return "button";
        case "checkbox": return "checkbox";
        case "email": case "tel": case "text": case "url": case null: case undefined: return "textbox";
        case "number": return "spinbutton";
        case "radio": return "radio";
        case "range": return "slider";
        case "search": return "searchbox";
        default: return "textbox";
      }
    case "li": return el.closest("ul, ol, menu") ? "listitem" : null;
    case "main": return "main";
    case "math": return "math";
    case "menu": return "list";
    case "meter": return "meter";
    case "nav": return "navigation";
    case "ol": case "ul": return "list";
    case "optgroup": return "group";
    case "option": return "option";
    case "output": return "status";
    case "progress": return "progressbar";
    case "section":
      return el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")
        ? "region" : null;
    case "select":
      return el.hasAttribute("multiple") || (el as HTMLSelectElement).size > 1
        ? "listbox" : "combobox";
    case "summary": return "button";
    case "table": return "table";
    case "tbody": case "tfoot": case "thead": return "rowgroup";
    case "td": return "cell";
    case "textarea": return "textbox";
    case "th": return "columnheader";
    case "tr": return "row";
    default: return null;
  }
}

/**
 * Return the computed ARIA role for an element: the explicit `role`
 * attribute if present, otherwise the implicit role derived from the
 * HTML tag name and attributes.  Results are cached per-audit via a
 * WeakMap (call `clearComputedRoleCache()` between audits).
 */
export function getComputedRole(el: Element): string | null {
  const cached = _computedRoleCache.get(el);
  if (cached !== undefined) return cached;

  const explicit = el.getAttribute("role")?.trim().toLowerCase() || null;
  const result = explicit || getImplicitRole(el);

  _computedRoleCache.set(el, result);
  return result;
}

// ---------------------------------------------------------------------------
// Accessible name
// ---------------------------------------------------------------------------

let _accessibleNameCache = new WeakMap<Element, string>();

export function clearAccessibleNameCache(): void {
  _accessibleNameCache = new WeakMap();
}

export function getAccessibleName(el: Element): string {
  const cached = _accessibleNameCache.get(el);
  if (cached !== undefined) return cached;
  const result = _computeAccessibleName(el);
  _accessibleNameCache.set(el, result);
  return result;
}

function _computeAccessibleName(el: Element): string {
  // aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const names = labelledBy
      .split(/\s+/)
      .map((id) => {
        const ref = el.ownerDocument.getElementById(id);
        return ref ? getAccessibleTextContent(ref).trim() : "";
      })
      .filter(Boolean);
    if (names.length) return names.join(" ");
  }

  // aria-label
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  // For inputs, check <label>
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.id) {
      const label = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      const labelText = label ? getAccessibleTextContent(label).trim() : "";
      if (labelText) return labelText;
    }
    const parentLabel = el.closest("label");
    const parentLabelText = parentLabel ? getAccessibleTextContent(parentLabel).trim() : "";
    if (parentLabelText) return parentLabelText;
  }

  // title
  const title = el.getAttribute("title")?.trim();
  if (title) return title;

  // placeholder as fallback for form controls (browsers expose it as name)
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const placeholder = el.getAttribute("placeholder")?.trim();
    if (placeholder) return placeholder;
  }

  // fieldset: name from <legend>
  const tagName = el.tagName.toLowerCase();
  if (tagName === "fieldset") {
    const legend = el.querySelector(":scope > legend");
    if (legend) {
      const legendText = getAccessibleTextContent(legend).trim();
      if (legendText) return legendText;
    }
  }

  // table: name from <caption>
  if (tagName === "table") {
    const caption = el.querySelector(":scope > caption");
    if (caption) {
      const captionText = getAccessibleTextContent(caption).trim();
      if (captionText) return captionText;
    }
  }

  // text content for non-input elements
  if (!(el instanceof HTMLInputElement)) {
    const text = getAccessibleTextContent(el).trim();
    if (text) return text;
  }

  // alt for images, area elements, and input[type="image"]
  if (el instanceof HTMLImageElement || el instanceof HTMLAreaElement) {
    return el.alt?.trim() ?? "";
  }
  if (el instanceof HTMLInputElement && el.type === "image") {
    return el.alt?.trim() ?? "";
  }

  return "";
}

const VALID_ARIA_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "blockquote",
  "button", "caption", "cell", "checkbox", "code", "columnheader", "combobox",
  "complementary", "contentinfo", "definition", "deletion", "dialog",
  "directory", "document", "emphasis", "feed", "figure", "form", "generic",
  "grid", "gridcell", "group", "heading", "img", "insertion", "link", "list",
  "listbox", "listitem", "log", "main", "marquee", "math", "menu", "menubar",
  "menuitem", "menuitemcheckbox", "menuitemradio", "meter", "navigation",
  "none", "note", "option", "paragraph", "presentation", "progressbar",
  "radio", "radiogroup", "region", "row", "rowgroup", "rowheader",
  "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton",
  "status", "strong", "subscript", "superscript", "switch", "tab", "table",
  "tablist", "tabpanel", "term", "textbox", "time", "timer", "toolbar",
  "tooltip", "tree", "treegrid", "treeitem",
]);

export function isValidRole(role: string): boolean {
  // Strip Unicode curly quotes that some CMSes inject into role values
  const cleaned = role.trim().toLowerCase().replace(/[\u201C\u201D\u2018\u2019\u00AB\u00BB]/g, "");
  return VALID_ARIA_ROLES.has(cleaned);
}

export const GLOBAL_ARIA_ATTRS = new Set([
  "aria-atomic", "aria-braillelabel", "aria-brailleroledescription",
  "aria-busy", "aria-controls", "aria-current",
  "aria-describedby", "aria-details", "aria-disabled", "aria-dropeffect",
  "aria-errormessage", "aria-flowto", "aria-grabbed", "aria-haspopup",
  "aria-hidden", "aria-invalid", "aria-keyshortcuts", "aria-label",
  "aria-labelledby", "aria-live", "aria-owns", "aria-relevant",
  "aria-roledescription",
]);

export function isValidAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRS.has(attr) || attr.startsWith("aria-");
}

/**
 * Check if an element or any ancestor is hidden via computed styles
 * (display:none, visibility:hidden) or aria-hidden. This catches stylesheet-
 * applied hiding that isAriaHidden misses (which only checks inline styles).
 */
export function isComputedHidden(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (isRemovedFromA11yTree(current)) return true;
    current = current.parentElement;
  }
  return false;
}

let _ariaHiddenCache = new WeakMap<Element, boolean>();

export function clearAriaHiddenCache(): void {
  _ariaHiddenCache = new WeakMap();
}

export function isAriaHidden(el: Element): boolean {
  const cached = _ariaHiddenCache.get(el);
  if (cached !== undefined) return cached;

  let result: boolean;
  if (el.getAttribute("aria-hidden") === "true") {
    result = true;
  } else if (el instanceof HTMLElement && (el.hidden || el.style.display === "none")) {
    result = true;
  } else if (el.parentElement) {
    result = isAriaHidden(el.parentElement);
  } else {
    result = false;
  }

  _ariaHiddenCache.set(el, result);
  return result;
}

/**
 * Check if an element is removed from the accessibility tree
 * (aria-hidden="true", hidden attribute, or display:none).
 */
function isRemovedFromA11yTree(el: Element): boolean {
  if (el.getAttribute("aria-hidden") === "true") return true;
  if (el instanceof HTMLElement && el.hidden) return true;
  if (typeof getComputedStyle === "function") {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return true;
  } else if (el instanceof HTMLElement && el.style.display === "none") {
    return true;
  }
  return false;
}

/**
 * Get text content from an element, excluding descendants
 * removed from the accessibility tree.
 */
export function getAccessibleTextContent(el: Element): string {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      text += node.textContent ?? "";
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const child = node as Element;
      if (!isRemovedFromA11yTree(child)) {
        const tagName = child.tagName?.toLowerCase();
        if (tagName === "img" || tagName === "area") {
          // Images/areas contribute their accessible name:
          // aria-labelledby > aria-label > alt > title
          const imgLabelledBy = child.getAttribute("aria-labelledby");
          if (imgLabelledBy) {
            const imgNames = imgLabelledBy
              .split(/\s+/)
              .map((id) => child.ownerDocument.getElementById(id)?.textContent?.trim() ?? "")
              .filter(Boolean);
            if (imgNames.length) {
              text += imgNames.join(" ");
              continue;
            }
          }
          text += child.getAttribute("aria-label")?.trim()
            ?? child.getAttribute("alt")
            ?? child.getAttribute("title")?.trim()
            ?? "";
        } else if (tagName === "svg") {
          // SVGs contribute their aria-label or <title> child text
          const svgLabel = child.getAttribute("aria-label")?.trim();
          if (svgLabel) {
            text += svgLabel;
          } else {
            const title = child.querySelector("title");
            if (title) text += title.textContent ?? "";
          }
        } else if (child.getAttribute("aria-label")?.trim()) {
          // Elements with aria-label contribute their label (e.g. role="img")
          text += child.getAttribute("aria-label")!.trim();
        } else {
          text += getAccessibleTextContent(child);
        }
      }
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// Visible text extraction
// ---------------------------------------------------------------------------

/**
 * Extract truly visible text from an element, excluding:
 * - Non-rendered elements (style, script, SVG)
 * - Elements with role="img" or role="presentation"
 * - aria-hidden subtrees
 * - Elements hidden via inline display:none
 */
export function getVisibleText(el: Element): string {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      text += node.textContent ?? "";
    } else if (node.nodeType === 1 /* ELEMENT_NODE */) {
      const child = node as Element;
      const tag = child.tagName.toLowerCase();
      // Skip non-rendered elements — their content is not visible text
      if (tag === "style" || tag === "script" || tag === "svg") continue;
      // Skip elements removed from the accessibility tree
      if (child.getAttribute("aria-hidden") === "true") continue;
      if (child instanceof HTMLElement && child.style.display === "none") continue;
      // Skip role=img and role=presentation (icon wrappers)
      const role = child.getAttribute("role");
      if (role === "img" || role === "presentation" || role === "none") continue;
      text += getVisibleText(child);
    }
  }
  return text;
}

// ---------------------------------------------------------------------------
// Visibility helpers
// ---------------------------------------------------------------------------

/** Check if an element or any ancestor has inline visibility:hidden. */
export function isVisibilityHidden(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (current instanceof HTMLElement && current.style.visibility === "hidden") return true;
    current = current.parentElement;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Explicit accessible name (aria-labelledby > aria-label > title attribute)
// ---------------------------------------------------------------------------

/**
 * Return the explicit accessible name for an element, checking only
 * aria-labelledby, aria-label, and the title attribute. Does NOT fall
 * through to text content, alt, labels, or other naming mechanisms.
 */
export function getExplicitAccessibleName(el: Element): string {
  // aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const names = labelledBy
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean);
    if (names.length) return names.join(" ");
  }

  // aria-label
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  // title attribute
  const title = el.getAttribute("title")?.trim();
  if (title) return title;

  return "";
}

// ---------------------------------------------------------------------------
// Shadow DOM
// ---------------------------------------------------------------------------

/** Check whether an element is inside a Shadow DOM tree. */
export function isInShadowDOM(el: Element): boolean {
  return el.getRootNode() instanceof ShadowRoot;
}
