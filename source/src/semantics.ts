// The source-mode semantics: which rules can be asked of a component file at
// all, and which of an element's unknowns make a rule's verdict unprovable.
//
// One principle governs every table here: what the source does not pin down
// must produce silence, not a guess. A finding this package emits has to be a
// defect at runtime no matter what the unknowns turn out to be; anything else
// is a suppressed candidate for a later layer to adjudicate against real
// evidence. False negatives are the accepted price.

/**
 * Never run in source mode.
 *
 * Two groups, for two different reasons:
 *
 * Rendering-dependent. Source has no layout, no stylesheet, and no paint, so
 * these rules have nothing honest to read. Matches the disable list the ERB
 * path already carries.
 *
 * Cross-element idref. The adapter emits both arms of a conditional as sibling
 * elements, so a rule that reasons about one element by resolving an idref to
 * another could be reasoning about a DOM that never exists. Modeling branch
 * exclusivity is deliberately out of scope for v1.
 */
export const SOURCE_MODE_DISABLED_RULES = [
  // Rendering-dependent
  "distinguishable/color-contrast",
  "distinguishable/color-contrast-enhanced",
  "distinguishable/link-in-text-block",
  "distinguishable/letter-spacing",
  "distinguishable/line-height",
  "distinguishable/word-spacing",
  "keyboard-accessible/scrollable-region",
  "keyboard-accessible/focus-visible",
  // A `<div tabindex="0">` is either a keyboard-reachable scroll container — the
  // recommended pattern — or a control built out of a div. Which one it is
  // depends on whether the element scrolls, and that is a layout fact. Same
  // gap as scrollable-region above, so the same answer.
  "keyboard-accessible/focus-order",
  "aria/aria-hidden-focus",
  "landmarks/region",
  // Cross-element idref
  "labels-and-names/duplicate-id-aria",
  "labels-and-names/form-label",
  "adaptable/td-headers-attr",
  "aria/aria-valid-attr-value",
] as const;

/**
 * Rules whose subject is a fragment's missing *ancestor*. A component that
 * renders one `<li>` keeps its list in the file that renders it; the engine is
 * right that the parent is missing and wrong that it is a defect. Carried over
 * from the ERB path, where these are the only two that produced false
 * positives.
 */
export const FRAGMENT_DISABLED_RULES = [
  "adaptable/listitem-parent",
  "adaptable/aria-required-parent",
  // Extended here, and only here: in source mode *every* file is a fragment by
  // definition, and a `<dt>`/`<dd>` whose `<dl>` lives in the component that
  // renders it has exactly the shape the two rules above were disabled for. The
  // ERB path leaves this one on because it had produced no false positive
  // there; a component file is a different bet.
  "adaptable/dl-children",
] as const;

/**
 * The one page-level rule a component file can still answer, and only when the
 * file contains a literal intrinsic `<html>` tag (a Next.js root layout, a
 * Remix root). All the evidence is local to that one tag, so it holds at the
 * zero-false-positive bar. Deliberately not extended to document-title or
 * landmark-main even then: Next supplies those from `metadata` and from
 * children, so "missing" is unprovable.
 */
export const HTML_ELEMENT_RULE = "readable/html-has-lang";

/**
 * Container integrity: these read an element's *direct* children and nothing
 * deeper, so only a direct unknown child silences them. A `<div>` mapped into a
 * `<ul>` is still a finding when the `<div>`'s own contents are unknown — the
 * defect is where the div sits, not what it holds.
 */
export const DIRECT_CHILD_RULES = new Set([
  "adaptable/list-children",
  "adaptable/definition-list",
  "adaptable/aria-required-children",
]);

/**
 * Rules whose verdict depends on what an element *contains* — container
 * integrity, and every name-from-content rule. A component child or an opaque
 * expression child makes the contents unknown, so these go silent for that
 * element. All but DIRECT_CHILD_RULES read the whole subtree: an accessible name
 * comes from any descendant, and a table's cells are not its children.
 */
export const CHILD_DEPENDENT_RULES = new Set([
  "adaptable/list-children",
  "adaptable/definition-list",
  "adaptable/aria-required-children",
  "adaptable/th-has-data-cells",
  "adaptable/td-has-header",
  "adaptable/empty-table-header",
  "labels-and-names/frame-focusable-content",
  "labels-and-names/multiple-labels",
  "labels-and-names/label-content-mismatch",
  "labels-and-names/label-title-only",
  "labels-and-names/label-placeholder-only",
  "aria/presentational-children-focusable",
  "keyboard-accessible/nested-interactive",
  "time-based-media/video-captions",
  "time-based-media/audio-transcript",
  "text-alternatives/object-alt",
  "text-alternatives/svg-img-alt",
  "text-alternatives/role-img-alt",
  ...nameFromContentRules(),
]);

/**
 * The child-dependent rules that report a *cell* rather than the container whose
 * contents decide the verdict. `td-has-header` reports the `<td>`, but it is the
 * surrounding `<table>`'s unknowns that decide whether the finding stands.
 *
 * The container integrity rules (`list-children`, `definition-list`) are not
 * here: they report the `<ul>`/`<dl>` itself, so the element in hand already is
 * the container.
 */
export const TABLE_CONTAINER_RULES = new Set(["adaptable/td-has-header"]);

/** Rules that resolve an accessible name, which any descendant can supply. */
function nameFromContentRules(): string[] {
  return [
    "labels-and-names/button-name",
    "labels-and-names/input-button-name",
    "labels-and-names/summary-name",
    "labels-and-names/aria-command-name",
    "labels-and-names/aria-input-field-name",
    "labels-and-names/aria-toggle-field-name",
    "labels-and-names/aria-meter-name",
    "labels-and-names/aria-progressbar-name",
    "labels-and-names/aria-dialog-name",
    "labels-and-names/aria-tooltip-name",
    "labels-and-names/aria-treeitem-name",
    "navigable/link-name",
    "navigable/empty-heading",
  ];
}

/**
 * Rules that resolve an accessible name. `aria-labelledby` pointing at an id
 * this file does not define is the normal way a component is named — the target
 * lives in the page that renders it — so a missing-name finding on such an
 * element is unprovable here.
 */
export const NAME_FAMILY_RULES = new Set(nameFromContentRules());

/**
 * Rules that read the document as an ordered whole. Emitting both arms of a
 * conditional puts elements next to each other that never coexist, so these go
 * silent for the whole file once it contains any exclusive branch.
 */
export const DOC_ORDER_DEPENDENT_RULES = new Set([
  "navigable/heading-order",
  "navigable/p-as-heading",
  "labels-and-names/frame-title-unique",
  "labels-and-names/multiple-labels",
]);

/**
 * Attributes that can take an element — and everything under it — out of the
 * accessibility tree. An expression value for one of these silences every
 * finding in the subtree, because the elements may not be there to violate
 * anything. `role` is not here: it changes what an element *is*, which the
 * per-rule dependency table below already accounts for.
 */
export const SUBTREE_SEMANTICS_ATTRIBUTES = new Set(["aria-hidden", "hidden", "inert", "style"]);

/**
 * Style properties that can remove an element from the accessibility tree. A
 * style object with an expression value for one of these is a semantics
 * unknown; an expression value for `width` is not.
 */
export const VISIBILITY_STYLE_PROPERTIES = new Set([
  "display",
  "visibility",
  "opacity",
  "content-visibility",
]);

/**
 * Per rule, the attributes whose *values* it reads. An expression value for one
 * of them makes that rule unprovable on that element; an expression value for
 * anything else leaves the rule free to fire.
 *
 * This is the table that buys the yield. `<img src={user.avatarUrl} />` with no
 * alt is the case the whole package exists for: `src` is not in img-alt's
 * dependencies, `alt` is provably absent, so the finding stands.
 *
 * A rule absent from this table depends on `"any"`: any expression-valued
 * attribute on the element silences it. That is the safe default, and the way
 * to give a rule more reach is to read it and add a row.
 */
export const RULE_ATTRIBUTE_DEPENDENCIES: Record<string, readonly string[]> = {
  // Reads alt, role, tabindex (presentation is overridden when focusable), and
  // the accessible name (aria-label / aria-labelledby / title).
  "text-alternatives/img-alt": [
    "alt",
    "role",
    "tabindex",
    "aria-label",
    "aria-labelledby",
    "title",
  ],
  "text-alternatives/input-image-alt": [
    "alt",
    "type",
    "role",
    "value",
    "aria-label",
    "aria-labelledby",
    "title",
  ],
  "text-alternatives/area-alt": ["alt", "href", "role", "aria-label", "aria-labelledby", "title"],
  // Name-family rules: name sources only.
  "navigable/link-name": ["href", "role", "aria-label", "aria-labelledby", "title"],
  "labels-and-names/button-name": [
    "type",
    "value",
    "role",
    "disabled",
    "tabindex",
    "aria-label",
    "aria-labelledby",
    "title",
  ],
  "labels-and-names/input-button-name": [
    "type",
    "value",
    "role",
    "aria-label",
    "aria-labelledby",
    "title",
  ],
  "labels-and-names/summary-name": ["role", "aria-label", "aria-labelledby", "title"],
  "navigable/empty-heading": ["role", "aria-label", "aria-labelledby", "title"],
  // Container integrity: the container's own role is the only value read (a
  // presentational container has no semantics to enforce). What matters for
  // these is the child set, which CHILD_DEPENDENT_RULES covers.
  "adaptable/list-children": ["role"],
  "adaptable/dl-children": ["role"],
  "adaptable/definition-list": ["role"],
  "adaptable/aria-required-children": ["role"],
  // Single-attribute rules.
  "keyboard-accessible/tabindex": ["tabindex"],
  "keyboard-accessible/accesskeys": ["accesskey"],
  "adaptable/autocomplete-valid": ["autocomplete", "type", "role"],
  "adaptable/scope-attr-valid": ["scope", "role"],
  "readable/valid-lang": ["lang", "xml:lang"],
  [HTML_ELEMENT_RULE]: ["lang"],
  // Judges which aria attributes are *present*, never their values, so an
  // expression value cannot change the verdict.
  "aria/aria-valid-attr": [],
  "aria/aria-roles": ["role"],
  "aria/aria-required-attr": ["role"],
  "aria/aria-allowed-attr": ["role"],
  "aria/aria-prohibited-attr": ["role", "aria-label", "aria-labelledby"],
};

/** Every rule not in the table above depends on every unknown attribute. */
export const DEPENDS_ON_ANY_UNKNOWN = "any";

export function attributeDependencies(
  ruleId: string,
): readonly string[] | typeof DEPENDS_ON_ANY_UNKNOWN {
  return RULE_ATTRIBUTE_DEPENDENCIES[ruleId] ?? DEPENDS_ON_ANY_UNKNOWN;
}

/**
 * Stand-in for an expression in text position. Any word works; it only has to
 * be non-empty and read as plain text. Same choice, and the same reasoning, as
 * the ERB neutralizer: a missing name is reported, a stray text node is not.
 */
export const TEXT_PLACEHOLDER = "Text";

/** Stand-in for an expression in attribute position: present, non-empty, inert. */
export const ATTRIBUTE_PLACEHOLDER = "unknown";

/**
 * Elements read for their text content: their accessible name comes from what
 * is inside them, so an expression there is text the user will hear. Note what
 * is absent — `ul`, `ol`, `dl`, `table`, `tr`, `select` and the layout
 * containers constrain their *children*, and text dropped into one is a
 * violation of the container, not a name for it. Copied from the ERB
 * neutralizer, which is where this trade was settled.
 */
export const TEXT_ELEMENTS = new Set([
  "a",
  "abbr",
  "address",
  "b",
  "button",
  "caption",
  "cite",
  "code",
  "dd",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "label",
  "legend",
  "li",
  "mark",
  "option",
  "output",
  "p",
  "q",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "td",
  "th",
  "time",
  "title",
  "u",
]);

/** No content, so they never become a parent and never self-close wrongly. */
export const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
