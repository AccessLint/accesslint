import type { NodeMeta } from "./emit";

/**
 * What a dialect adapter produces: the synthetic document, plus the node table
 * that maps every emitted element back to the source and to what the source
 * left unknown.
 */
export interface SourceRender {
  /** Contents of `<head>`, from a literal intrinsic `<html><head>` only. */
  headHtml: string;
  /** Everything else, in source order. */
  bodyHtml: string;
  /** Attributes of a literal intrinsic `<html>`, applied to the documentElement. */
  htmlAttributes: [string, string][];
  /** Node-table index of a literal intrinsic `<html>`, when the file has one. */
  htmlNodeIndex: number | null;
  nodes: NodeMeta[];
  /** True when the file emits elements from exclusive branches. */
  hasBranch: boolean;
  /**
   * How many independent JSX trees the file contributed. Two components in one
   * file land as siblings and never coexist on a page, which is the same hazard
   * a branch is: an `<h1>` in one and an `<h3>` in the other is not a heading
   * order.
   */
  rootCount: number;
}
