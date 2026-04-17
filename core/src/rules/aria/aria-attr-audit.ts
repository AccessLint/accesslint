import type { Violation, FixSuggestion } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";

export const VALID_ARIA_ATTRS = new Set([
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-braillelabel",
  "aria-brailleroledescription",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colindextext",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-description",
  "aria-details",
  "aria-disabled",
  "aria-dropeffect",
  "aria-errormessage",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowindextext",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",
]);

const BOOLEAN_ATTRS = new Set([
  "aria-atomic",
  "aria-busy",
  "aria-disabled",
  "aria-grabbed",
  "aria-hidden",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-readonly",
  "aria-required",
]);

const TRISTATE_ATTRS = new Set(["aria-checked", "aria-pressed"]);

const INTEGER_ATTRS = new Set([
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-level",
  "aria-posinset",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
  "aria-setsize",
]);

const NUMBER_ATTRS = new Set(["aria-valuemax", "aria-valuemin", "aria-valuenow"]);

const TOKEN_ATTRS: Record<string, Set<string>> = {
  "aria-autocomplete": new Set(["inline", "list", "both", "none"]),
  "aria-expanded": new Set(["true", "false", "undefined"]),
  "aria-current": new Set(["page", "step", "location", "date", "time", "true", "false"]),
  "aria-dropeffect": new Set(["copy", "execute", "link", "move", "none", "popup"]),
  "aria-haspopup": new Set(["true", "false", "menu", "listbox", "tree", "grid", "dialog"]),
  "aria-invalid": new Set(["grammar", "false", "spelling", "true"]),
  "aria-live": new Set(["assertive", "off", "polite"]),
  "aria-orientation": new Set(["horizontal", "vertical", "undefined"]),
  "aria-relevant": new Set(["additions", "all", "removals", "text"]),
  "aria-sort": new Set(["ascending", "descending", "none", "other"]),
};

const NO_NAME_ROLES = new Set([
  "caption",
  "code",
  "deletion",
  "emphasis",
  "generic",
  "insertion",
  "mark",
  "none",
  "paragraph",
  "presentation",
  "strong",
  "subscript",
  "superscript",
  "suggestion",
  "term",
  "time",
]);

// Elements where aria-label/aria-labelledby is prohibited because their
// implicit role is "generic" and naming isn't supported.
// NOTE: We intentionally EXCLUDE <span> and <i> — while the ARIA spec
// technically prohibits naming on generic roles, axe-core and real-world
// usage treat aria-label on <span>/<i> as valid (commonly used for icon
// labels).  Flagging them produces many false positives.
const NO_NAME_ELEMENTS: Record<string, boolean> = {
  abbr: true,
  bdi: true,
  bdo: true,
  br: true,
  cite: true,
  code: true,
  data: true,
  del: true,
  dfn: true,
  em: true,
  ins: true,
  kbd: true,
  mark: true,
  q: true,
  rp: true,
  rt: true,
  ruby: true,
  s: true,
  samp: true,
  small: true,
  strong: true,
  sub: true,
  sup: true,
  time: true,
  u: true,
  var: true,
  wbr: true,
};

const PROHIBITED_ATTRS: Record<string, Set<string>> = {
  alert: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  article: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  banner: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  blockquote: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  caption: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  code: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  complementary: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  contentinfo: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  definition: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  deletion: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  emphasis: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  generic: new Set([
    "aria-disabled",
    "aria-errormessage",
    "aria-haspopup",
    "aria-invalid",
    "aria-label",
    "aria-labelledby",
    "aria-roledescription",
  ]),
  img: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  insertion: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  main: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  mark: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  math: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  navigation: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  none: new Set(["aria-label", "aria-labelledby"]),
  note: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  paragraph: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  presentation: new Set(["aria-label", "aria-labelledby"]),
  region: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  search: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  status: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  strong: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  subscript: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  superscript: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  term: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  time: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
  tooltip: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid"]),
};

export interface AriaAttrAuditResult {
  validAttr: Violation[];
  validAttrValue: Violation[];
  prohibitedAttr: Violation[];
}

let _cachedDoc: WeakRef<Document> | null = null;
let _cachedResult: AriaAttrAuditResult | null = null;

export function clearAriaAttrAuditCache(): void {
  _cachedDoc = null;
  _cachedResult = null;
}

export function runAriaAttrAudit(doc: Document): AriaAttrAuditResult {
  if (_cachedResult && _cachedDoc?.deref() === doc) return _cachedResult;

  const validAttr: Violation[] = [];
  const validAttrValue: Violation[] = [];
  const prohibitedAttr: Violation[] = [];

  for (const el of doc.querySelectorAll("*")) {
    let hasAriaAttr = false;
    for (const attr of el.attributes) {
      if (attr.name.startsWith("aria-")) {
        hasAriaAttr = true;
        break;
      }
    }
    if (!hasAriaAttr) continue;

    // Lazily compute selector/html only when a violation is found
    let selector: string | undefined;
    let html: string | undefined;
    const lazy = () => {
      if (selector === undefined) {
        selector = getSelector(el);
        html = getHtmlSnippet(el);
      }
      return { selector, html: html! };
    };

    // --- aria-valid-attr ---
    for (const attr of el.attributes) {
      if (attr.name.startsWith("aria-") && !VALID_ARIA_ATTRS.has(attr.name)) {
        const v = lazy();
        validAttr.push({
          ruleId: "aria/aria-valid-attr",
          selector: v.selector,
          html: v.html,
          impact: "critical",
          message: `Invalid ARIA attribute "${attr.name}".`,
          fix: { type: "remove-attribute" as const, attribute: attr.name },
        });
        break;
      }
    }

    // --- aria-valid-attr-value ---
    for (const attr of el.attributes) {
      if (!attr.name.startsWith("aria-")) continue;
      const val = attr.value.trim();
      // Skip empty values — there's no value to validate (inapplicable)
      if (val === "" && !BOOLEAN_ATTRS.has(attr.name) && !TRISTATE_ATTRS.has(attr.name)) continue;

      if (BOOLEAN_ATTRS.has(attr.name)) {
        if (val !== "true" && val !== "false") {
          const v = lazy();
          validAttrValue.push({
            ruleId: "aria/aria-valid-attr-value",
            selector: v.selector,
            html: v.html,
            impact: "critical",
            message: `${attr.name} must be "true" or "false", got "${val}".`,
            fix: { type: "set-attribute" as const, attribute: attr.name, value: "false" },
          });
        }
      } else if (TRISTATE_ATTRS.has(attr.name)) {
        if (val !== "true" && val !== "false" && val !== "mixed") {
          const v = lazy();
          validAttrValue.push({
            ruleId: "aria/aria-valid-attr-value",
            selector: v.selector,
            html: v.html,
            impact: "critical",
            message: `${attr.name} must be "true", "false", or "mixed", got "${val}".`,
            fix: { type: "set-attribute" as const, attribute: attr.name, value: "false" },
          });
        }
      } else if (INTEGER_ATTRS.has(attr.name)) {
        if (val === "" || !/^-?\d+$/.test(val)) {
          const v = lazy();
          validAttrValue.push({
            ruleId: "aria/aria-valid-attr-value",
            selector: v.selector,
            html: v.html,
            impact: "critical",
            message: `${attr.name} must be an integer, got "${val}".`,
            fix: {
              type: "suggest" as const,
              suggestion: `Set ${attr.name} to a valid integer value`,
            },
          });
        }
      } else if (NUMBER_ATTRS.has(attr.name)) {
        if (val === "" || isNaN(Number(val))) {
          const v = lazy();
          validAttrValue.push({
            ruleId: "aria/aria-valid-attr-value",
            selector: v.selector,
            html: v.html,
            impact: "critical",
            message: `${attr.name} must be a number, got "${val}".`,
            fix: {
              type: "suggest" as const,
              suggestion: `Set ${attr.name} to a valid number value`,
            },
          });
        }
      } else if (TOKEN_ATTRS[attr.name]) {
        const tokens = val.split(/\s+/);
        for (const token of tokens) {
          if (!TOKEN_ATTRS[attr.name].has(token)) {
            const v = lazy();
            validAttrValue.push({
              ruleId: "aria/aria-valid-attr-value",
              selector: v.selector,
              html: v.html,
              impact: "critical",
              message: `Invalid value "${val}" for ${attr.name}.`,
              fix: {
                type: "suggest" as const,
                suggestion: `Set ${attr.name} to one of: ${[...TOKEN_ATTRS[attr.name]].join(", ")}`,
              },
            });
            break;
          }
        }
      }
    }

    // --- aria-prohibited-attr (only for non-hidden elements) ---
    if (!isAriaHidden(el)) {
      const explicitRole = el.getAttribute("role")?.trim().toLowerCase();
      const tagName = el.tagName.toLowerCase();

      if (!explicitRole && NO_NAME_ELEMENTS[tagName]) {
        const hasAriaLabel = el.hasAttribute("aria-label");
        const hasAriaLabelledby = el.hasAttribute("aria-labelledby");

        if (hasAriaLabel || hasAriaLabelledby) {
          const v = lazy();
          const prohibitedName = hasAriaLabel ? "aria-label" : "aria-labelledby";
          prohibitedAttr.push({
            ruleId: "aria/aria-prohibited-attr",
            selector: v.selector,
            html: v.html,
            impact: "serious",
            message: `aria-label and aria-labelledby are prohibited on <${tagName}> elements.`,
            fix: { type: "remove-attribute" as const, attribute: prohibitedName },
          });
        }
      } else if (explicitRole) {
        if (NO_NAME_ROLES.has(explicitRole)) {
          const hasAriaLabel = el.hasAttribute("aria-label");
          const hasAriaLabelledby = el.hasAttribute("aria-labelledby");

          if (hasAriaLabel || hasAriaLabelledby) {
            const v = lazy();
            const prohibitedName = hasAriaLabel ? "aria-label" : "aria-labelledby";
            prohibitedAttr.push({
              ruleId: "aria/aria-prohibited-attr",
              selector: v.selector,
              html: v.html,
              impact: "serious",
              message: `aria-label and aria-labelledby are prohibited on role "${explicitRole}".`,
              fix: { type: "remove-attribute" as const, attribute: prohibitedName },
            });
          }
        }

        const prohibited = PROHIBITED_ATTRS[explicitRole];
        if (prohibited) {
          for (const attr of el.attributes) {
            if (attr.name.startsWith("aria-") && prohibited.has(attr.name)) {
              if (
                (attr.name === "aria-label" || attr.name === "aria-labelledby") &&
                NO_NAME_ROLES.has(explicitRole)
              ) {
                continue;
              }
              const v = lazy();
              prohibitedAttr.push({
                ruleId: "aria/aria-prohibited-attr",
                selector: v.selector,
                html: v.html,
                impact: "serious",
                message: `Attribute "${attr.name}" is prohibited on role "${explicitRole}".`,
                fix: { type: "remove-attribute" as const, attribute: attr.name },
              });
            }
          }
        }
      }
    }
  }

  _cachedDoc = new WeakRef(doc);
  _cachedResult = { validAttr, validAttrValue, prohibitedAttr };
  return _cachedResult;
}
