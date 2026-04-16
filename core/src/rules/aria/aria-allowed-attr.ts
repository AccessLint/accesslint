import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden, getComputedRole, GLOBAL_ARIA_ATTRS } from "../utils/aria";

// Role to allowed ARIA attributes mapping based on ARIA 1.2 spec
const ROLE_ALLOWED_ATTRS: Record<string, Set<string>> = {
  alert: new Set(["aria-atomic", "aria-busy", "aria-live", "aria-relevant"]),
  alertdialog: new Set(["aria-describedby", "aria-modal"]),
  application: new Set(["aria-activedescendant", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-haspopup", "aria-invalid"]),
  article: new Set(["aria-posinset", "aria-setsize"]),
  banner: new Set([]),
  button: new Set(["aria-disabled", "aria-expanded", "aria-haspopup", "aria-pressed"]),
  cell: new Set(["aria-colindex", "aria-colspan", "aria-rowindex", "aria-rowspan"]),
  checkbox: new Set(["aria-checked", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-invalid", "aria-readonly", "aria-required"]),
  columnheader: new Set(["aria-colindex", "aria-colspan", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-haspopup", "aria-invalid", "aria-readonly", "aria-required", "aria-rowindex", "aria-rowspan", "aria-selected", "aria-sort"]),
  combobox: new Set(["aria-activedescendant", "aria-autocomplete", "aria-controls", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-haspopup", "aria-invalid", "aria-readonly", "aria-required"]),
  complementary: new Set([]),
  contentinfo: new Set([]),
  definition: new Set([]),
  dialog: new Set(["aria-describedby", "aria-modal"]),
  directory: new Set([]),
  document: new Set(["aria-expanded"]),
  feed: new Set(["aria-busy"]),
  figure: new Set([]),
  form: new Set([]),
  grid: new Set(["aria-activedescendant", "aria-colcount", "aria-disabled", "aria-multiselectable", "aria-readonly", "aria-rowcount"]),
  gridcell: new Set(["aria-colindex", "aria-colspan", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-haspopup", "aria-invalid", "aria-readonly", "aria-required", "aria-rowindex", "aria-rowspan", "aria-selected"]),
  group: new Set(["aria-activedescendant", "aria-disabled"]),
  heading: new Set(["aria-level"]),
  img: new Set([]),
  link: new Set(["aria-disabled", "aria-expanded", "aria-haspopup"]),
  list: new Set([]),
  listbox: new Set(["aria-activedescendant", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-invalid", "aria-multiselectable", "aria-orientation", "aria-readonly", "aria-required"]),
  listitem: new Set(["aria-level", "aria-posinset", "aria-setsize"]),
  log: new Set(["aria-atomic", "aria-busy", "aria-live", "aria-relevant"]),
  main: new Set([]),
  marquee: new Set([]),
  math: new Set([]),
  menu: new Set(["aria-activedescendant", "aria-disabled", "aria-orientation"]),
  menubar: new Set(["aria-activedescendant", "aria-disabled", "aria-orientation"]),
  menuitem: new Set(["aria-disabled", "aria-expanded", "aria-haspopup", "aria-posinset", "aria-setsize"]),
  menuitemcheckbox: new Set(["aria-checked", "aria-disabled", "aria-expanded", "aria-haspopup", "aria-posinset", "aria-setsize"]),
  menuitemradio: new Set(["aria-checked", "aria-disabled", "aria-expanded", "aria-haspopup", "aria-posinset", "aria-setsize"]),
  meter: new Set(["aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"]),
  navigation: new Set([]),
  none: new Set([]),
  note: new Set([]),
  option: new Set(["aria-checked", "aria-disabled", "aria-posinset", "aria-selected", "aria-setsize"]),
  paragraph: new Set([]),
  presentation: new Set([]),
  progressbar: new Set(["aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"]),
  radio: new Set(["aria-checked", "aria-disabled", "aria-posinset", "aria-setsize"]),
  radiogroup: new Set(["aria-activedescendant", "aria-disabled", "aria-errormessage", "aria-invalid", "aria-orientation", "aria-readonly", "aria-required"]),
  region: new Set([]),
  row: new Set(["aria-activedescendant", "aria-colindex", "aria-disabled", "aria-expanded", "aria-level", "aria-posinset", "aria-rowindex", "aria-selected", "aria-setsize"]),
  rowgroup: new Set([]),
  rowheader: new Set(["aria-colindex", "aria-colspan", "aria-disabled", "aria-errormessage", "aria-expanded", "aria-haspopup", "aria-invalid", "aria-readonly", "aria-required", "aria-rowindex", "aria-rowspan", "aria-selected", "aria-sort"]),
  scrollbar: new Set(["aria-controls", "aria-disabled", "aria-orientation", "aria-valuemax", "aria-valuemin", "aria-valuenow"]),
  search: new Set([]),
  searchbox: new Set(["aria-activedescendant", "aria-autocomplete", "aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid", "aria-multiline", "aria-placeholder", "aria-readonly", "aria-required"]),
  separator: new Set(["aria-disabled", "aria-orientation", "aria-valuemax", "aria-valuemin", "aria-valuenow"]),
  slider: new Set(["aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid", "aria-orientation", "aria-readonly", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"]),
  spinbutton: new Set(["aria-activedescendant", "aria-disabled", "aria-errormessage", "aria-invalid", "aria-readonly", "aria-required", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext"]),
  status: new Set(["aria-atomic", "aria-live", "aria-relevant"]),
  switch: new Set(["aria-checked", "aria-disabled", "aria-errormessage", "aria-invalid", "aria-readonly", "aria-required"]),
  tab: new Set(["aria-disabled", "aria-expanded", "aria-haspopup", "aria-posinset", "aria-selected", "aria-setsize"]),
  table: new Set(["aria-colcount", "aria-rowcount"]),
  tablist: new Set(["aria-activedescendant", "aria-disabled", "aria-multiselectable", "aria-orientation"]),
  tabpanel: new Set([]),
  term: new Set([]),
  textbox: new Set(["aria-activedescendant", "aria-autocomplete", "aria-disabled", "aria-errormessage", "aria-haspopup", "aria-invalid", "aria-multiline", "aria-placeholder", "aria-readonly", "aria-required"]),
  timer: new Set(["aria-atomic", "aria-live", "aria-relevant"]),
  toolbar: new Set(["aria-activedescendant", "aria-disabled", "aria-orientation"]),
  tooltip: new Set([]),
  tree: new Set(["aria-activedescendant", "aria-disabled", "aria-errormessage", "aria-invalid", "aria-multiselectable", "aria-orientation", "aria-required"]),
  treegrid: new Set(["aria-activedescendant", "aria-colcount", "aria-disabled", "aria-errormessage", "aria-invalid", "aria-multiselectable", "aria-orientation", "aria-readonly", "aria-required", "aria-rowcount"]),
  treeitem: new Set(["aria-checked", "aria-disabled", "aria-expanded", "aria-haspopup", "aria-level", "aria-posinset", "aria-selected", "aria-setsize"]),
};


export const ariaAllowedAttr: Rule = {
  id: "aria/aria-allowed-attr",
  category: "aria",
  actRuleIds: ["5c01ea"],
  wcag: ["4.1.2"],
  level: "A",
  fixability: "mechanical",
  description: "ARIA attributes must be allowed for the element's role.",
  guidance: "Each ARIA role supports specific attributes. Using unsupported attributes creates confusion for assistive technologies. Check the ARIA specification for which attributes are valid for each role, or remove the attribute if it's not needed.",
  run(doc) {
    const violations = [];

    const candidates = new Set<Element>(doc.querySelectorAll("[role]"));
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, 1 /* NodeFilter.SHOW_ELEMENT */);
    let node: Node | null = walker.currentNode;
    while (node) {
      if (node instanceof Element) {
        for (const attr of node.attributes) {
          if (attr.name.startsWith("aria-")) {
            candidates.add(node);
            break;
          }
        }
      }
      node = walker.nextNode();
    }
    for (const el of candidates) {
      if (isAriaHidden(el)) continue;

      const role = getComputedRole(el);
      if (!role) continue;

      const allowedAttrs = ROLE_ALLOWED_ATTRS[role];
      if (!allowedAttrs) continue; // Unknown role handled by aria-roles rule

      for (const attr of el.attributes) {
        if (!attr.name.startsWith("aria-")) continue;
        if (GLOBAL_ARIA_ATTRS.has(attr.name)) continue;
        if (allowedAttrs.has(attr.name)) continue;

        const allowed = allowedAttrs.size > 0
          ? [...allowedAttrs].join(", ")
          : "none (only global ARIA attributes)";

        violations.push({
          ruleId: "aria/aria-allowed-attr",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "critical" as const,
          message: `ARIA attribute "${attr.name}" is not allowed on role "${role}".`,
          context: `Attribute: ${attr.name}="${attr.value}", role: ${role}, allowed role-specific attributes: ${allowed}`,
          fix: { type: "remove-attribute" as const, attribute: attr.name },
        });
      }
    }

    return violations;
  },
};
