import { parse, type ParserOptions } from "@babel/parser";
import type * as t from "@babel/types";
import { Emitter, escapeText, type NodeMeta, type Unknowable } from "../emit";
import { wrapperFor, type SourceRender, type SourceTree } from "../render";
import {
  ATTRIBUTE_PLACEHOLDER,
  SUBTREE_SEMANTICS_ATTRIBUTES,
  TEXT_ELEMENTS,
  TEXT_PLACEHOLDER,
} from "../semantics";
import { attributeName, CONTENT_PROPS, resolveStyleObject, type StyleResult } from "./attributes";

export interface RenderJsxOptions {
  /** `.tsx` and `.ts` parse differently from `.jsx`: `<T>` is a type parameter. */
  typescript?: boolean;
}

/**
 * Parse a JSX/TSX file and render its intrinsic elements as HTML.
 *
 * Returns null when the file does not parse. That is the package's contract, not
 * an oversight: a half-understood file must produce no findings rather than
 * guesses about a tree we did not read.
 */
export function renderJsx(source: string, options: RenderJsxOptions = {}): SourceRender | null {
  const ast = parseJsx(source, options.typescript !== false);
  if (!ast) return null;
  return new JsxAdapter(source).render(ast);
}

type Plugins = NonNullable<ParserOptions["plugins"]>;

const BASE_PLUGINS: Plugins = ["jsx", "decorators-legacy"];

function parseJsx(source: string, typescript: boolean): t.File | null {
  // TypeScript first for .tsx (the dialect decides), then a plain-JS attempt,
  // then Flow — a few .jsx files in the wild still carry Flow annotations.
  const attempts: Plugins[] = typescript
    ? [[...BASE_PLUGINS, "typescript"], BASE_PLUGINS]
    : [BASE_PLUGINS, [...BASE_PLUGINS, "flow"], [...BASE_PLUGINS, "typescript"]];

  for (const plugins of attempts) {
    try {
      return parse(source, { sourceType: "unambiguous", plugins, ranges: false });
    } catch {
      continue;
    }
  }
  return null;
}

/** What a child contributes to its parent element beyond markup. */
interface Emitted {
  html: string;
  /** Makes the parent's *direct* children unknown. */
  unknowable?: Unknowable;
  /** Makes everything in the parent's subtree unknown, however deep it sits. */
  contentUnknown?: Unknowable;
}

/** What a child needs to know about where it sits. */
interface ParentInfo {
  tag: string;
  /**
   * Whether an expression here produces a name someone reads. True inside a
   * text-read element or anything carrying a role, and false once the element
   * is already named by aria-label / aria-labelledby — filling that in buys
   * nothing and costs a label-content-mismatch against a stand-in word.
   */
  textPosition: boolean;
}

type AttributeValue =
  | { kind: "known"; value: string }
  | { kind: "absent" }
  | { kind: "unknown"; expression: string };

const MAX_EXPRESSION_LENGTH = 120;

class JsxAdapter {
  private readonly emitter = new Emitter();
  private hasBranch = false;

  constructor(private readonly source: string) {}

  render(ast: t.File): SourceRender {
    const trees: SourceTree[] = [];
    let htmlRootSeen = false;

    for (const root of findJsxRoots(ast)) {
      // Each root is its own tree, and its own document later: they are
      // independent components, and concatenating them lets the HTML parser
      // rearrange one root's elements around another's.
      const branchBefore = this.hasBranch;
      this.hasBranch = false;

      if (root.type === "JSXFragment") {
        trees.push(this.tree(this.children(root.children, null, false).html));
      } else {
        const name = elementName(root.openingElement.name);
        if (name.intrinsic && name.tag === "html" && !htmlRootSeen) {
          htmlRootSeen = true;
          trees.push(this.documentTree(root));
        } else {
          trees.push(this.tree(this.node(root, null, false).html));
        }
      }

      this.hasBranch = branchBefore;
    }

    return { trees, nodes: this.emitter.nodes };
  }

  private tree(bodyHtml: string, extras: Partial<SourceTree> = {}): SourceTree {
    return {
      headHtml: "",
      bodyHtml,
      htmlAttributes: [],
      htmlNodeIndex: null,
      wrapper: wrapperFor(bodyHtml),
      hasBranch: this.hasBranch,
      ...extras,
    };
  }

  /**
   * A root layout's `<html>` is the one page-level shape a component file can
   * legitimately carry. The document already has an html element, so this one
   * contributes its attributes to the documentElement and its head/body children
   * are distributed into the real head and body.
   */
  private documentTree(root: t.JSXElement): SourceTree {
    const headParts: string[] = [];
    const bodyParts: string[] = [];
    const { attributes, meta } = this.attributes(root.openingElement, false, "html");

    for (const child of root.children) {
      if (child.type === "JSXElement") {
        const childName = elementName(child.openingElement.name);
        if (childName.intrinsic && childName.tag === "head") {
          headParts.push(
            this.children(child.children, { tag: "head", textPosition: false }, false).html,
          );
          continue;
        }
        if (childName.intrinsic && childName.tag === "body") {
          bodyParts.push(
            this.children(child.children, { tag: "body", textPosition: false }, false).html,
          );
          continue;
        }
      }
      bodyParts.push(this.child(child, { tag: "html", textPosition: false }, false).html);
    }

    return this.tree(bodyParts.join(""), {
      headHtml: headParts.join(""),
      htmlAttributes: attributes,
      htmlNodeIndex: this.emitter.allocate(meta),
    });
  }

  /** A JSX element or fragment, wherever it sits. */
  private node(
    node: t.JSXElement | t.JSXFragment,
    parent: ParentInfo | null,
    branch: boolean,
  ): Emitted {
    if (node.type === "JSXFragment") {
      // `<>` is not an element and hides nothing: its children are right here.
      return this.children(node.children, parent, branch);
    }
    return this.element(node, parent, branch);
  }

  private element(node: t.JSXElement, parent: ParentInfo | null, branch: boolean): Emitted {
    const name = elementName(node.openingElement.name);

    if (!name.intrinsic) {
      // Components are transparent: the element vanishes and its children are
      // emitted in place, so intrinsic islands inside a component stay
      // auditable. What the component itself renders is unknown here, which is
      // what the parent has to be told.
      const unknowable: Unknowable = {
        kind: "component-child",
        detail: `<${name.text}> is a component; what it renders is not in this file`,
        expression: `<${name.text}>`,
      };

      // Except in a table or a select. There, the component's real output is a
      // row or an option, and emitting its children in its place puts markup
      // where an HTML parser will not keep it: a `<h1>` inside `<tbody>` is
      // foster-parented out, element and text separately, which flattens
      // everything after it and reports empty headings that are not empty.
      if (parent && STRICT_CONTENT_TAGS.has(parent.tag)) {
        return { html: "", unknowable, contentUnknown: unknowable };
      }

      const inner = this.children(node.children, null, branch);
      return { html: inner.html, unknowable, contentUnknown: unknowable };
    }

    const tag = name.tag;
    const { attributes, meta, textPosition } = this.attributes(node.openingElement, branch, tag);
    const contents = this.children(node.children, { tag, textPosition }, branch);
    if (!meta.unknowableChild) meta.unknowableChild = contents.unknowable;
    meta.unknownContent = meta.unknowableChild ?? contents.contentUnknown;

    const index = this.emitter.allocate(meta);
    return {
      html: this.emitter.element(index, tag, attributes, contents.html),
      // The element itself is a known child of its parent; what is unknown is
      // what sits inside it, and that carries all the way up because an
      // accessible name is computed from the whole subtree.
      contentUnknown: meta.unknownContent,
    };
  }

  private attributes(
    open: t.JSXOpeningElement,
    branch: boolean,
    tag: string,
  ): { attributes: [string, string][]; meta: NodeMeta; textPosition: boolean } {
    const meta: NodeMeta = {
      line: open.loc?.start.line ?? 1,
      column: (open.loc?.start.column ?? 0) + 1,
      tag,
      unknownAttributes: new Map(),
      pinnedAfterSpread: new Set(),
      branch,
    };

    const attributes: [string, string][] = [];
    let hasRole = false;
    let named = false;

    // The ordering calculus: an attribute's value is known only when no later
    // spread can override it, and its *absence* is never provable once any
    // spread is present.
    let lastSpread = -1;
    open.attributes.forEach((attribute, index) => {
      if (attribute.type === "JSXSpreadAttribute") lastSpread = index;
    });

    open.attributes.forEach((attribute, index) => {
      if (attribute.type === "JSXSpreadAttribute") {
        meta.spread = { expression: this.text(attribute.argument) };
        return;
      }

      const prop =
        attribute.name.type === "JSXNamespacedName"
          ? `${attribute.name.namespace.name}:${attribute.name.name.name}`
          : attribute.name.name;

      if (CONTENT_PROPS.has(prop)) {
        // `dangerouslySetInnerHTML` and `children={...}` are markup we cannot
        // read, so the element's contents are unknown.
        meta.unknowableChild = {
          kind: "opaque-expression",
          detail: `${prop} supplies contents this file does not describe`,
          expression: this.text(attribute),
        };
        return;
      }

      const name = attributeName(prop);
      if (name === null) return;

      const resolved =
        name === "style" ? this.styleValue(attribute) : this.attributeValue(attribute);

      if (name === "aria-label" || name === "aria-labelledby") named = true;

      const overridable = index < lastSpread;
      if (name === "role" && resolved.kind === "known" && resolved.value.trim() && !overridable) {
        hasRole = true;
      }

      if (resolved.kind === "unknown") {
        meta.unknownAttributes.set(name, {
          expression: resolved.expression,
          cause: "expression",
        });
        if (SUBTREE_SEMANTICS_ATTRIBUTES.has(name)) {
          meta.subtreeUnknown = { attribute: name, expression: resolved.expression };
        }
      } else if (overridable) {
        meta.unknownAttributes.set(name, {
          expression: this.spreadAfter(open, index),
          cause: "spread",
        });
      } else if (lastSpread >= 0) {
        meta.pinnedAfterSpread.add(name);
      }

      // A utility class is the other common way a component hides something,
      // and `hidden` means display:none everywhere it is used. We do not claim
      // the element *is* hidden — only that we cannot prove it is not.
      if (name === "class" && resolved.kind === "known" && hidingClass(resolved.value)) {
        meta.subtreeUnknown = { attribute: "class", expression: resolved.value };
      }

      if (resolved.kind === "absent") return;
      attributes.push([name, resolved.kind === "known" ? resolved.value : ATTRIBUTE_PLACEHOLDER]);
    });

    return {
      attributes,
      meta,
      textPosition: (TEXT_ELEMENTS.has(tag) || hasRole) && !named,
    };
  }

  /** The first spread written after this attribute — the one that can override it. */
  private spreadAfter(open: t.JSXOpeningElement, index: number): string {
    const spread = open.attributes
      .slice(index + 1)
      .find((attribute) => attribute.type === "JSXSpreadAttribute");
    return spread ? this.text((spread as t.JSXSpreadAttribute).argument) : "";
  }

  private attributeValue(attribute: t.JSXAttribute): AttributeValue {
    const value = attribute.value;
    // `<input disabled />` — present, empty value.
    if (value === null || value === undefined) return { kind: "known", value: "" };
    if (value.type === "StringLiteral") return { kind: "known", value: value.value };
    if (value.type === "JSXElement" || value.type === "JSXFragment") {
      return { kind: "unknown", expression: this.text(value) };
    }
    if (value.type !== "JSXExpressionContainer") {
      return { kind: "unknown", expression: this.text(value) };
    }
    return this.expressionValue(value.expression);
  }

  private expressionValue(node: t.Expression | t.JSXEmptyExpression): AttributeValue {
    const expression = unwrap(node);
    switch (expression.type) {
      case "StringLiteral":
        return { kind: "known", value: expression.value };
      case "NumericLiteral":
        return { kind: "known", value: String(expression.value) };
      // `tabIndex={-1}` is a unary minus over a literal, not a literal.
      case "UnaryExpression":
        if (
          (expression.operator === "-" || expression.operator === "+") &&
          expression.argument.type === "NumericLiteral"
        ) {
          return {
            kind: "known",
            value: `${expression.operator === "-" ? "-" : ""}${expression.argument.value}`,
          };
        }
        return { kind: "unknown", expression: this.text(expression) };
      case "BooleanLiteral":
        // React omits a false-valued attribute entirely, and that is provable.
        return expression.value ? { kind: "known", value: "" } : { kind: "absent" };
      case "NullLiteral":
        return { kind: "absent" };
      case "Identifier":
        if (expression.name === "undefined") return { kind: "absent" };
        return { kind: "unknown", expression: this.text(expression) };
      case "TemplateLiteral":
        if (expression.expressions.length === 0) {
          return { kind: "known", value: expression.quasis.map((q) => q.value.cooked).join("") };
        }
        return { kind: "unknown", expression: this.text(expression) };
      default:
        return { kind: "unknown", expression: this.text(expression) };
    }
  }

  private styleValue(attribute: t.JSXAttribute): AttributeValue {
    const value = attribute.value;
    if (value?.type === "StringLiteral") return { kind: "known", value: value.value };
    if (value?.type !== "JSXExpressionContainer") {
      return { kind: "unknown", expression: this.text(attribute) };
    }
    const expression = unwrap(value.expression);
    if (expression.type === "StringLiteral") return { kind: "known", value: expression.value };
    if (expression.type !== "ObjectExpression") {
      return { kind: "unknown", expression: this.text(expression) };
    }

    let hasSpread = false;
    const properties = expression.properties.map((property) => {
      if (property.type !== "ObjectProperty") {
        hasSpread = true;
        return { property: null, literal: null };
      }
      const key =
        property.key.type === "Identifier"
          ? property.key.name
          : property.key.type === "StringLiteral"
            ? property.key.value
            : null;
      const declared = unwrap(property.value as t.Expression);
      const literal =
        declared.type === "StringLiteral"
          ? declared.value
          : declared.type === "NumericLiteral"
            ? String(declared.value)
            : null;
      return { property: key, literal };
    });

    const style: StyleResult = resolveStyleObject(properties, hasSpread);
    if (style.kind === "unknown") return { kind: "unknown", expression: this.text(expression) };
    if (!style.css) return { kind: "absent" };
    return { kind: "known", value: style.css };
  }

  private children(
    children: (
      | t.JSXElement
      | t.JSXFragment
      | t.JSXText
      | t.JSXExpressionContainer
      | t.JSXSpreadChild
    )[],
    parent: ParentInfo | null,
    branch: boolean,
  ): Emitted {
    const parts: string[] = [];
    let unknowable: Unknowable | undefined;
    let contentUnknown: Unknowable | undefined;

    for (const child of children) {
      const emitted = this.child(child, parent, branch);
      parts.push(emitted.html);
      if (!unknowable) unknowable = emitted.unknowable;
      if (!contentUnknown) contentUnknown = emitted.contentUnknown;
    }

    return { html: parts.join(""), unknowable, contentUnknown };
  }

  private child(
    child: t.JSXElement | t.JSXFragment | t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild,
    parent: ParentInfo | null,
    branch: boolean,
  ): Emitted {
    switch (child.type) {
      case "JSXText":
        return { html: jsxText(child.value) };
      case "JSXElement":
      case "JSXFragment":
        return this.node(child, parent, branch);
      case "JSXExpressionContainer":
        return this.expression(child.expression, parent, branch);
      case "JSXSpreadChild":
        return this.opaque(child.expression, parent);
    }
  }

  /**
   * The three-tier expression model. Tier 1 is a literal, used as written. Tier
   * 2 is JSX inside an expression — a `.map` callback, a ternary arm, the right
   * of `&&` — which is walked into and emitted, because `items.map(i => <div/>)`
   * inside a `<ul>` is a provable runtime defect. Tier 3 is opaque: silence,
   * except for a stand-in in text position.
   */
  private expression(
    node: t.Expression | t.JSXEmptyExpression,
    parent: ParentInfo | null,
    branch: boolean,
  ): Emitted {
    const expression = unwrap(node);

    switch (expression.type) {
      // `{/* a comment */}` renders nothing, and hides nothing.
      case "JSXEmptyExpression":
        return { html: "" };
      case "JSXElement":
      case "JSXFragment":
        return this.node(expression, parent, branch);
      case "StringLiteral":
        return { html: escapeText(expression.value) };
      case "NumericLiteral":
        return { html: escapeText(String(expression.value)) };
      case "TemplateLiteral":
        if (expression.expressions.length === 0) {
          return { html: escapeText(expression.quasis.map((q) => q.value.cooked).join("")) };
        }
        return this.opaque(expression, parent);
      // React renders none of these, which is knowable.
      case "BooleanLiteral":
      case "NullLiteral":
        return { html: "" };
      case "Identifier":
        if (expression.name === "undefined") return { html: "" };
        return this.opaque(expression, parent);

      case "ConditionalExpression": {
        // Both arms are emitted, so the elements are real but the order is not.
        this.hasBranch = true;
        return this.combine([
          this.expression(expression.consequent, parent, true),
          this.expression(expression.alternate, parent, true),
        ]);
      }

      case "LogicalExpression": {
        this.hasBranch = true;
        const arms =
          expression.operator === "&&"
            ? [this.expression(expression.right as t.Expression, parent, true)]
            : [
                this.expression(expression.left as t.Expression, parent, true),
                this.expression(expression.right as t.Expression, parent, true),
              ];
        return this.combine(arms);
      }

      case "ArrayExpression": {
        const arms = expression.elements.map((element) =>
          element === null || element.type === "SpreadElement"
            ? this.opaque(element ?? expression, parent)
            : this.expression(element as t.Expression, parent, branch),
        );
        return this.combine(arms);
      }

      case "CallExpression":
        return this.call(expression, parent, branch);

      default:
        return this.opaque(expression, parent);
    }
  }

  /**
   * `items.map(item => <li>…</li>)` is the shape almost every list in a React
   * component takes. The callback's return value is what lands in the DOM, so
   * walking into it is what lets container rules stay on: a `<div>` returned
   * into a `<ul>` is a defect whatever `items` holds. Iteration is repetition,
   * not exclusivity, so a single-return callback is not a branch.
   */
  private call(node: t.CallExpression, parent: ParentInfo | null, branch: boolean): Emitted {
    const callee = node.callee;
    const method =
      callee.type === "MemberExpression" && callee.property.type === "Identifier"
        ? callee.property.name
        : null;
    if (method !== "map" && method !== "flatMap") return this.opaque(node, parent);

    const callback = node.arguments[0];
    if (
      !callback ||
      (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression")
    ) {
      return this.opaque(node, parent);
    }

    return this.returns(callback, parent, branch);
  }

  private returns(
    callback: t.ArrowFunctionExpression | t.FunctionExpression,
    parent: ParentInfo | null,
    branch: boolean,
  ): Emitted {
    if (callback.body.type !== "BlockStatement") {
      return this.expression(callback.body, parent, branch);
    }

    const returned = returnedExpressions(callback.body);
    if (returned.length === 0) return { html: "" };
    // More than one return is a branch: only one of them ever renders.
    const exclusive = returned.length > 1;
    if (exclusive) this.hasBranch = true;
    return this.combine(
      returned.map((expression) => this.expression(expression, parent, branch || exclusive)),
    );
  }

  private combine(parts: Emitted[]): Emitted {
    return {
      html: parts.map((part) => part.html).join(""),
      unknowable: parts.find((part) => part.unknowable)?.unknowable,
      contentUnknown: parts.find((part) => part.contentUnknown)?.contentUnknown,
    };
  }

  /**
   * Tier 3. The element's contents become unknown, which silences every rule
   * that reads them; and where text is what an element is read for, a stand-in
   * word stands in for it — the trade the ERB neutralizer settled, for the same
   * reason. A missing name is reported, a stray text node is not.
   */
  private opaque(node: t.Node, parent: ParentInfo | null): Emitted {
    const expression = this.text(node);
    const unknowable: Unknowable = {
      kind: "opaque-expression",
      detail: `\`${expression}\` may render anything`,
      expression,
    };
    const html = parent?.textPosition ? escapeText(TEXT_PLACEHOLDER) : "";
    return { html, unknowable, contentUnknown: unknowable };
  }

  /** The source text of a node, for the record of what was unknown. */
  private text(node: t.Node): string {
    if (
      node.start === null ||
      node.start === undefined ||
      node.end === null ||
      node.end === undefined
    ) {
      return "";
    }
    const text = this.source.slice(node.start, node.end).replace(/\s+/g, " ").trim();
    return text.length > MAX_EXPRESSION_LENGTH ? `${text.slice(0, MAX_EXPRESSION_LENGTH)}…` : text;
  }
}

/**
 * Elements whose children an HTML parser will rearrange if they are not the
 * children it expects. A component sitting in one of these is left unexpanded.
 */
const STRICT_CONTENT_TAGS = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "colgroup",
  "select",
  "optgroup",
]);

/** Utility classes whose whole job is to take the element out of the layout. */
const HIDING_CLASSES = new Set(["hidden", "invisible"]);

/**
 * `hidden md:block` is not hidden — it is hidden on a phone and shown from the
 * md breakpoint up, which is the single most common shape a Tailwind class list
 * takes. Only an unqualified hide counts, or every responsive column in every
 * marketing page goes unaudited.
 */
const RESHOWN_AT_BREAKPOINT =
  /^[a-z0-9]+:(block|flex|grid|inline|inline-block|inline-flex|table|table-cell|contents|visible)$/;

function hidingClass(value: string): boolean {
  const tokens = value.split(/\s+/);
  if (!tokens.some((token) => HIDING_CLASSES.has(token))) return false;
  return !tokens.some((token) => RESHOWN_AT_BREAKPOINT.test(token));
}

function unwrap(node: t.Expression | t.JSXEmptyExpression): t.Expression | t.JSXEmptyExpression {
  let current = node;
  for (;;) {
    switch (current.type) {
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
      case "TSTypeAssertion":
      case "TypeCastExpression":
      case "ParenthesizedExpression":
        current = current.expression;
        break;
      default:
        return current;
    }
  }
}

/**
 * JSX drops whitespace-only text that spans lines and collapses interior
 * newline runs to a single space — the indentation in a component file is not
 * content.
 */
function jsxText(raw: string): string {
  if (/^\s*$/.test(raw)) return raw.includes("\n") ? "" : escapeText(raw);
  const trimmed = raw.replace(/^[ \t]*\n\s*/, "").replace(/\s*\n[ \t]*$/, "");
  return escapeText(trimmed.replace(/\s*\n\s*/g, " "));
}

interface ElementName {
  intrinsic: boolean;
  tag: string;
  text: string;
}

/**
 * JSX's own rule: a lowercase name is an intrinsic element, anything else is a
 * component. A namespaced name (`<svg:circle>`) is intrinsic; a member
 * expression (`<Card.Header>`) never is.
 */
function elementName(name: t.JSXOpeningElement["name"]): ElementName {
  if (name.type === "JSXIdentifier") {
    const intrinsic = /^[a-z]/.test(name.name);
    return { intrinsic, tag: name.name.toLowerCase(), text: name.name };
  }
  if (name.type === "JSXNamespacedName") {
    const text = `${name.namespace.name}:${name.name.name}`;
    return { intrinsic: true, tag: text.toLowerCase(), text };
  }
  return { intrinsic: false, tag: "", text: memberName(name) };
}

function memberName(name: t.JSXMemberExpression): string {
  const object =
    name.object.type === "JSXMemberExpression" ? memberName(name.object) : name.object.name;
  return `${object}.${name.property.name}`;
}

/** Return statements in a function body, not descending into nested functions. */
function returnedExpressions(body: t.BlockStatement): t.Expression[] {
  const found: t.Expression[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const type = (node as { type?: string }).type;
    if (!type) return;
    if (type.endsWith("FunctionExpression") || type === "FunctionDeclaration") return;
    if (type === "ReturnStatement") {
      const argument = (node as t.ReturnStatement).argument;
      if (argument) found.push(argument);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIPPED_AST_KEYS.has(key)) continue;
      visit(value);
    }
  };
  visit(body.body);
  return found;
}

const SKIPPED_AST_KEYS = new Set([
  "loc",
  "start",
  "end",
  "range",
  "extra",
  "comments",
  "leadingComments",
  "trailingComments",
  "innerComments",
  "tokens",
]);

/**
 * Every JSX element or fragment with no JSX ancestor, in source order. A file
 * with several components contributes several roots; they land as siblings,
 * which is safe because source mode never asks a page-level or cross-element
 * idref question.
 */
function findJsxRoots(ast: t.File): (t.JSXElement | t.JSXFragment)[] {
  const roots: (t.JSXElement | t.JSXFragment)[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const type = (node as { type?: string }).type;
    if (!type) return;
    if (type === "JSXElement" || type === "JSXFragment") {
      roots.push(node as t.JSXElement | t.JSXFragment);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIPPED_AST_KEYS.has(key)) continue;
      visit(value);
    }
  };
  visit(ast.program.body);
  return roots;
}
