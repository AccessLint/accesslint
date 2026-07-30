import type { NodeMeta } from "./emit";

/**
 * One JSX root, rendered. Each is audited in a document of its own, and that is
 * not tidiness — it is correctness.
 *
 * A file's roots are independent trees: two components never coexist on a page.
 * Concatenating them into one body also hands the HTML parser a sequence it is
 * entitled to rearrange — a component returning `<tr>` puts the parser in table
 * mode, and every element after it gets foster-parented out of its own parent,
 * text and all. A docusaurus page audited that way reported an empty `<h1>`, an
 * empty `<button>`, and a link with no text, none of which were true.
 */
export interface SourceTree {
  /** Contents of `<head>`, from a literal intrinsic `<html><head>` only. */
  headHtml: string;
  bodyHtml: string;
  /** Attributes of a literal intrinsic `<html>`, applied to the documentElement. */
  htmlAttributes: [string, string][];
  /** Node-table index of a literal intrinsic `<html>`, when this root is one. */
  htmlNodeIndex: number | null;
  /**
   * The ancestors this fragment needs before an HTML parser will accept it. A
   * `<tr>` on its own is dropped; wrapped in `<table><tbody>` it survives intact.
   * Set means the container around the fragment is ours, not the author's, so no
   * rule may reason about it.
   */
  wrapper: TableWrapper | null;
  /** True when this root emits elements from exclusive branches. */
  hasBranch: boolean;
}

export type TableWrapper = "row" | "cell" | "section" | "column" | "option";

/**
 * What a dialect adapter produces: one tree per JSX root, plus the node table
 * that maps every emitted element back to the source and to what the source left
 * unknown.
 */
export interface SourceRender {
  trees: SourceTree[];
  nodes: NodeMeta[];
}

/** The minimal legal ancestors for a fragment that starts with a table part. */
const WRAPPERS: Record<TableWrapper, { open: string; close: string }> = {
  row: { open: "<table><tbody>", close: "</tbody></table>" },
  cell: { open: "<table><tbody><tr>", close: "</tr></tbody></table>" },
  section: { open: "<table>", close: "</table>" },
  column: { open: "<table><colgroup>", close: "</colgroup></table>" },
  option: { open: "<select>", close: "</select>" },
};

const WRAPPER_FOR_TAG: Record<string, TableWrapper> = {
  tr: "row",
  td: "cell",
  th: "cell",
  thead: "section",
  tbody: "section",
  tfoot: "section",
  caption: "section",
  colgroup: "section",
  col: "column",
  option: "option",
  optgroup: "option",
};

/**
 * The wrapper a fragment needs, decided by the tag it opens with — which is the
 * shape that actually occurs: a component whose whole job is to render one row
 * or one cell.
 */
export function wrapperFor(bodyHtml: string): TableWrapper | null {
  const match = /^<([a-z][a-z0-9-]*)\b/.exec(bodyHtml);
  return match ? (WRAPPER_FOR_TAG[match[1]] ?? null) : null;
}

export function wrapped(tree: SourceTree): string {
  if (!tree.wrapper) return tree.bodyHtml;
  const { open, close } = WRAPPERS[tree.wrapper];
  return `${open}${tree.bodyHtml}${close}`;
}
