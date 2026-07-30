import { VOID_ELEMENTS } from "./semantics";

/**
 * Every element the adapter emits carries this attribute, holding its index
 * into the node table. The audit layer reads the table into an
 * element-to-metadata map and then *removes* the attribute, so the engine — and
 * every HTML snippet it quotes back — sees a document with nothing of ours in
 * it.
 */
export const MARKER_ATTRIBUTE = "data-accesslint-node";

/** What the source said, and did not say, about one emitted element. */
export interface NodeMeta {
  /** 1-based source line of the element's opening tag. */
  line: number;
  /** 1-based source column of the element's opening tag. */
  column: number;
  tag: string;
  /** Set when the element carries `{...spread}`: absence is unprovable. */
  spread?: { expression: string };
  /** Attributes whose value the source does not pin down, and why. */
  unknownAttributes: Map<string, { expression: string; cause: "expression" | "spread" }>;
  /**
   * Attributes written after the last spread. Their state — a value, or
   * provably absent — is the one thing a spread cannot take back.
   */
  pinnedAfterSpread: Set<string>;
  /** An unknown that hides the element and everything under it. */
  subtreeUnknown?: { attribute: string; expression: string };
  /** Set when a child's contents are unknown: a component, or an opaque expression. */
  unknowableChild?: {
    kind: "component-child" | "opaque-expression";
    detail: string;
    expression?: string;
  };
  /** True when the element is emitted from one arm of an exclusive branch. */
  branch: boolean;
}

// JSX text and attribute strings carry HTML entities through to the DOM
// unchanged, so an `&` that already starts one is left alone rather than
// escaped into visible `&amp;nbsp;` text.
const BARE_AMPERSAND = /&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#[xX][0-9a-fA-F]+);)/g;

export function escapeText(text: string): string {
  return text.replace(BARE_AMPERSAND, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttribute(value: string): string {
  return value
    .replace(BARE_AMPERSAND, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Collects the node table while the adapter walks the AST, and serializes
 * elements into the synthetic HTML the engine parses.
 */
export class Emitter {
  readonly nodes: NodeMeta[] = [];

  allocate(meta: NodeMeta): number {
    this.nodes.push(meta);
    return this.nodes.length - 1;
  }

  element(index: number, tag: string, attributes: [string, string][], children: string): string {
    const parts = [`${MARKER_ATTRIBUTE}="${index}"`];
    for (const [name, value] of attributes) {
      parts.push(`${name}="${escapeAttribute(value)}"`);
    }
    const open = `<${tag} ${parts.join(" ")}`;
    if (VOID_ELEMENTS.has(tag)) return `${open} />`;
    return `${open}>${children}</${tag}>`;
  }
}
