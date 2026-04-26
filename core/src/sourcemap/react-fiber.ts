import type { SourceLocation, Violation } from "../rules/types";

/**
 * React DevTools-aware source resolver. Reads `_debugSource` off the fiber
 * attached to each violation's element, and walks `_debugOwner` for a small
 * trail of enclosing components.
 *
 * Requirements:
 * - Page is running React with the JSX `__source` transform (default for
 *   most dev builds: CRA, Next dev, Vite + React plugin).
 * - DOM nodes carry the standard `__reactFiber$<random>` property.
 *
 * Failure modes are silent: if no fiber is found, no DevTools hook is
 * present, or `_debugSource` is missing, the violation is left untouched.
 */

interface FiberDebugSource {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

interface FiberLike {
  type?: unknown;
  elementType?: unknown;
  _debugSource?: FiberDebugSource | null;
  _debugOwner?: FiberLike | null;
}

const MAX_OWNER_DEPTH = 3;

function getFiberFromNode(node: Element): FiberLike | null {
  // Modern React stores the fiber under a key like `__reactFiber$<random>`.
  // Older versions used `__reactInternalInstance$<random>`.
  for (const key of Object.keys(node)) {
    if (key.startsWith("__reactFiber$") || key.startsWith("__reactInternalInstance$")) {
      const fiber = (node as unknown as Record<string, unknown>)[key];
      if (fiber && typeof fiber === "object") return fiber as FiberLike;
    }
  }
  return null;
}

function getSymbol(fiber: FiberLike): string | undefined {
  const t = fiber.type ?? fiber.elementType;
  if (typeof t === "function") {
    const fn = t as { displayName?: string; name?: string };
    return fn.displayName || fn.name || undefined;
  }
  if (typeof t === "string") return t; // intrinsic ("div", "span") — usually not useful
  return undefined;
}

function locationFromDebugSource(
  src: FiberDebugSource,
  symbol: string | undefined,
  strategy: SourceLocation["strategy"],
  confidence: SourceLocation["confidence"],
): SourceLocation {
  const loc: SourceLocation = {
    file: src.fileName,
    line: src.lineNumber,
    strategy,
    confidence,
  };
  if (typeof src.columnNumber === "number") loc.column = src.columnNumber;
  if (symbol) loc.symbol = symbol;
  return loc;
}

function resolveFromFiber(fiber: FiberLike): SourceLocation[] {
  const out: SourceLocation[] = [];

  // Direct location of the JSX literal that rendered this element.
  if (fiber._debugSource) {
    out.push(locationFromDebugSource(fiber._debugSource, getSymbol(fiber), "react-fiber", "high"));
  }

  // Owner chain: the components that contain this JSX. First few only.
  let owner: FiberLike | null | undefined = fiber._debugOwner;
  let depth = 0;
  while (owner && depth < MAX_OWNER_DEPTH) {
    if (owner._debugSource) {
      out.push(
        locationFromDebugSource(
          owner._debugSource,
          getSymbol(owner),
          "react-owner",
          depth === 0 ? "medium" : "low",
        ),
      );
    }
    owner = owner._debugOwner;
    depth++;
  }

  return out;
}

/**
 * Mutates each violation in place, attaching `source` candidates when a
 * React fiber with debug info is found on the violating element. No-op for
 * violations without an `element`, for non-React pages, and for production
 * builds (no `_debugSource`). Never throws — failures are swallowed silently.
 */
export function attachReactFiberSource(violations: Violation[]): void {
  if (!violations || violations.length === 0) return;

  for (const violation of violations) {
    if (!violation.element) continue;
    if (violation.source && violation.source.length > 0) continue; // don't clobber

    try {
      const fiber = getFiberFromNode(violation.element);
      if (!fiber) continue;
      const locations = resolveFromFiber(fiber);
      if (locations.length > 0) violation.source = locations;
    } catch {
      // Intentionally ignored — source mapping is best-effort.
    }
  }
}
