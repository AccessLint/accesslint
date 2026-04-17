export function getWindow(node: Node): (Window & typeof globalThis) | null {
  return (node.ownerDocument?.defaultView as (Window & typeof globalThis) | null) ?? null;
}
