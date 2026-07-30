import { VISIBILITY_STYLE_PROPERTIES } from "../semantics";

/**
 * React prop names that are not the HTML attribute name. Everything else that
 * arrives camelCased (`tabIndex`, `readOnly`, `maxLength`) lowercases to its
 * attribute, which is what the HTML parser does anyway; anything already
 * hyphenated (`aria-*`, `data-*`) is passed through untouched.
 */
const RENAMED_PROPS: Record<string, string> = {
  className: "class",
  htmlFor: "for",
  httpEquiv: "http-equiv",
  acceptCharset: "accept-charset",
  // React renders these as the plain attribute; the audit cares about the
  // rendered DOM, not which prop controlled it.
  defaultValue: "value",
  defaultChecked: "checked",
};

/**
 * Props that exist for React and never reach the DOM. Dropping them is a false
 * negative at worst: no rule in the corpus reads an event handler, and an
 * emitted `onclick=""` would be a claim the source does not make.
 */
const DROPPED_PROPS = new Set([
  "key",
  "ref",
  "suppressHydrationWarning",
  "suppressContentEditableWarning",
]);

/** `children={...}` and `dangerouslySetInnerHTML` are contents, not attributes. */
export const CONTENT_PROPS = new Set(["children", "dangerouslySetInnerHTML"]);

export function isEventHandlerProp(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

/** The HTML attribute name for a JSX prop, or null when it never reaches the DOM. */
export function attributeName(prop: string): string | null {
  if (DROPPED_PROPS.has(prop)) return null;
  if (isEventHandlerProp(prop)) return null;
  const renamed = RENAMED_PROPS[prop];
  if (renamed) return renamed;
  if (prop.includes("-") || prop.includes(":")) return prop;
  return prop.toLowerCase();
}

function kebab(property: string): string {
  if (property.startsWith("--")) return property;
  return property.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * A style object is worth resolving rather than dropping: an element with
 * `display: none` is out of the accessibility tree, and rules skip it. Drop it
 * blind and every hidden element becomes a finding.
 *
 * Literal declarations are emitted. A non-literal value is skipped when its
 * property cannot hide anything, and makes the whole style unknown when it can
 * — `style={{ display: mode }}` could be `none`.
 */
export type StyleResult =
  | { kind: "known"; css: string }
  | { kind: "unknown"; reason: "visibility-property" | "opaque" };

export function resolveStyleObject(
  properties: { property: string | null; literal: string | null }[],
  hasSpread: boolean,
): StyleResult {
  if (hasSpread) return { kind: "unknown", reason: "opaque" };
  const declarations: string[] = [];
  for (const { property, literal } of properties) {
    if (property === null) return { kind: "unknown", reason: "opaque" };
    const name = kebab(property);
    if (literal === null) {
      if (VISIBILITY_STYLE_PROPERTIES.has(name)) {
        return { kind: "unknown", reason: "visibility-property" };
      }
      continue;
    }
    declarations.push(`${name}: ${literal}`);
  }
  return { kind: "known", css: declarations.join("; ") };
}
