import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getImplicitRole } from "../utils/aria";

// Elements that cannot have any role override
const NO_ROLE_ALLOWED = new Set([
  "base",
  "col",
  "colgroup",
  "head",
  "html",
  "keygen",
  "meta",
  "param",
  "script",
  "source",
  "style",
  "template",
  "title",
  "track",
]);

// Map of elements to allowed roles (beyond implicit role)
const ELEMENT_ALLOWED_ROLES: Record<string, Set<string> | "any" | "none"> = {
  a: new Set([
    "button",
    "checkbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "switch",
    "tab",
    "treeitem",
    "link",
  ]),
  "a[href]": new Set([
    "button",
    "checkbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "switch",
    "tab",
    "treeitem",
  ]),
  abbr: "any",
  address: "any",
  article: new Set(["application", "document", "feed", "main", "none", "presentation", "region"]),
  aside: new Set([
    "doc-dedication",
    "doc-example",
    "doc-footnote",
    "doc-glossary",
    "doc-pullquote",
    "doc-tip",
    "feed",
    "none",
    "note",
    "presentation",
    "region",
    "search",
  ]),
  audio: new Set(["application"]),
  b: "any",
  bdi: "any",
  bdo: "any",
  blockquote: "any",
  body: "none",
  br: new Set(["none", "presentation"]),
  button: new Set([
    "checkbox",
    "combobox",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "slider",
    "switch",
    "tab",
  ]),
  canvas: "any",
  caption: "none",
  cite: "any",
  code: "any",
  data: "any",
  datalist: new Set(["listbox"]),
  dd: "none",
  del: "any",
  details: new Set(["group"]),
  dfn: "any",
  dialog: new Set(["alertdialog"]),
  div: "any",
  dl: new Set(["group", "list", "none", "presentation"]),
  dt: new Set(["listitem"]),
  em: "any",
  embed: new Set(["application", "document", "img", "none", "presentation"]),
  fieldset: new Set(["group", "none", "presentation", "radiogroup"]),
  figcaption: new Set(["group", "none", "presentation"]),
  figure: new Set(["doc-example", "none", "presentation"]),
  footer: new Set(["doc-footnote", "group", "none", "presentation"]),
  form: new Set(["none", "presentation", "search"]),
  h1: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  h2: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  h3: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  h4: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  h5: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  h6: new Set(["doc-subtitle", "none", "presentation", "tab"]),
  header: new Set(["group", "none", "presentation"]),
  hgroup: "any",
  hr: new Set(["doc-pagebreak", "none", "presentation"]),
  i: "any",
  iframe: new Set(["application", "document", "img", "none", "presentation"]),
  img: "any", // Special handling needed for alt=""
  "img[alt='']": new Set(["none", "presentation"]),
  input: "none", // Special handling for type
  "input[type=button]": new Set([
    "checkbox",
    "combobox",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "slider",
    "spinbutton",
    "switch",
    "tab",
  ]),
  "input[type=checkbox]": new Set(["button", "menuitemcheckbox", "option", "switch"]),
  "input[type=image]": new Set([
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "radio",
    "switch",
  ]),
  "input[type=radio]": new Set(["menuitemradio"]),
  "input[type=search]": new Set(["combobox", "searchbox"]),
  "input[type=text]": new Set(["combobox", "searchbox", "spinbutton"]),
  ins: "any",
  kbd: "any",
  label: "none",
  legend: "none",
  li: new Set([
    "doc-biblioentry",
    "doc-endnote",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "none",
    "option",
    "presentation",
    "radio",
    "separator",
    "tab",
    "treeitem",
  ]),
  main: "none",
  map: "none",
  mark: "any",
  menu: new Set([
    "directory",
    "group",
    "listbox",
    "menu",
    "menubar",
    "none",
    "presentation",
    "radiogroup",
    "tablist",
    "toolbar",
    "tree",
  ]),
  meter: "none",
  nav: new Set([
    "doc-index",
    "doc-pagelist",
    "doc-toc",
    "menu",
    "menubar",
    "none",
    "presentation",
    "tablist",
  ]),
  noscript: "none",
  object: new Set(["application", "document", "img"]),
  ol: new Set([
    "directory",
    "group",
    "listbox",
    "menu",
    "menubar",
    "none",
    "presentation",
    "radiogroup",
    "tablist",
    "toolbar",
    "tree",
  ]),
  optgroup: new Set(["group"]),
  option: "none",
  output: new Set(["status"]),
  p: "any",
  picture: "none",
  pre: "any",
  progress: "none",
  q: "any",
  rp: "any",
  rt: "any",
  ruby: "any",
  s: "any",
  samp: "any",
  section: new Set([
    "alert",
    "alertdialog",
    "application",
    "banner",
    "complementary",
    "contentinfo",
    "dialog",
    "doc-abstract",
    "doc-acknowledgments",
    "doc-afterword",
    "doc-appendix",
    "doc-bibliography",
    "doc-chapter",
    "doc-colophon",
    "doc-conclusion",
    "doc-credit",
    "doc-credits",
    "doc-dedication",
    "doc-endnotes",
    "doc-epigraph",
    "doc-epilogue",
    "doc-errata",
    "doc-example",
    "doc-foreword",
    "doc-glossary",
    "doc-index",
    "doc-introduction",
    "doc-notice",
    "doc-pagelist",
    "doc-part",
    "doc-preface",
    "doc-prologue",
    "doc-pullquote",
    "doc-qna",
    "doc-toc",
    "document",
    "feed",
    "group",
    "log",
    "main",
    "marquee",
    "navigation",
    "none",
    "note",
    "presentation",
    "region",
    "search",
    "status",
    "tabpanel",
  ]),
  select: new Set(["menu"]),
  small: "any",
  span: "any",
  strong: "any",
  sub: "any",
  summary: "none",
  sup: "any",
  svg: new Set(["application", "document", "img", "none", "presentation"]),
  table: "any",
  tbody: "any",
  td: "any",
  tfoot: "any",
  th: "any",
  thead: "any",
  time: "any",
  tr: "any",
  u: "any",
  ul: new Set([
    "directory",
    "group",
    "listbox",
    "menu",
    "menubar",
    "none",
    "presentation",
    "radiogroup",
    "tablist",
    "toolbar",
    "tree",
  ]),
  var: "any",
  video: new Set(["application"]),
  wbr: new Set(["none", "presentation"]),
};

function getAllowedRoles(el: Element): Set<string> | "any" | "none" {
  const tagName = el.tagName.toLowerCase();

  if (NO_ROLE_ALLOWED.has(tagName)) {
    return "none";
  }

  // Check specific element+attribute combinations first
  if (tagName === "a" && el.hasAttribute("href")) {
    return ELEMENT_ALLOWED_ROLES["a[href]"] as Set<string>;
  }
  if (tagName === "img" && el.getAttribute("alt") === "") {
    return ELEMENT_ALLOWED_ROLES["img[alt='']"] as Set<string>;
  }
  if (tagName === "input") {
    const type = el.getAttribute("type")?.toLowerCase() || "text";
    const key = `input[type=${type}]`;
    if (key in ELEMENT_ALLOWED_ROLES) {
      return ELEMENT_ALLOWED_ROLES[key] as Set<string>;
    }
    return "none";
  }

  return ELEMENT_ALLOWED_ROLES[tagName] || "any";
}

export const ariaAllowedRole: Rule = {
  id: "aria/aria-allowed-role",
  category: "aria",
  wcag: ["4.1.2"],
  level: "A",
  fixability: "contextual",
  description: "ARIA role must be appropriate for the element.",
  guidance:
    "Not all ARIA roles can be applied to all HTML elements. Many elements have implicit roles (e.g., <header> is implicitly banner, <nav> is navigation, <main> is main). Adding an explicit role that matches the implicit role is redundant. Adding a conflicting role breaks semantics. Either remove the role attribute or use a different element.",
  run(doc) {
    const violations = [];

    for (const el of doc.querySelectorAll("[role]")) {
      if (isAriaHidden(el)) continue;

      const role = el.getAttribute("role")?.trim().toLowerCase();
      if (!role) continue;

      // Redundant roles (explicit role matches implicit) are valid per
      // ARIA-in-HTML spec — skip them.  E.g. <button role="button">,
      // <nav role="navigation">, <a href role="link">.
      const implicitRole = getImplicitRole(el);
      if (implicitRole && role === implicitRole) continue;

      const allowed = getAllowedRoles(el);

      if (allowed === "none") {
        violations.push({
          ruleId: "aria/aria-allowed-role",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "minor" as const,
          message: `Element <${el.tagName.toLowerCase()}> should not have an explicit role.`,
        });
      } else if (allowed !== "any" && !allowed.has(role)) {
        violations.push({
          ruleId: "aria/aria-allowed-role",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "minor" as const,
          message: `Role "${role}" is not allowed on element <${el.tagName.toLowerCase()}>.`,
        });
      }
    }

    return violations;
  },
};
