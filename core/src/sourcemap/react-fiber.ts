import type { SourceLocation, Violation } from "../rules/types";

/**
 * React DevTools-aware source resolver. Reads `_debugSource` off the fiber
 * attached to each violation's element, and walks `_debugOwner` for a small
 * trail of enclosing components.
 *
 * React 19 dropped `_debugSource` in favor of a captured Error stored on
 * `fiber._debugStack`. When `_debugSource` is absent we parse that stack to
 * recover the JSX call site (file/line/column) — typically a bundled chunk
 * URL the host can resolve via source maps.
 *
 * Requirements:
 * - Page is running React with the JSX `__source` transform (default for
 *   most dev builds: CRA, Next dev, Vite + React plugin).
 * - DOM nodes carry the standard `__reactFiber$<random>` property.
 *
 * Failure modes are silent: if no fiber is found, no DevTools hook is
 * present, or neither `_debugSource` nor `_debugStack` yields a user frame,
 * the violation is left untouched.
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
  _debugStack?: { stack?: string } | null;
  _debugOwner?: FiberLike | null;
}

const MAX_OWNER_DEPTH = 3;

// React-internal frame names we skip when scanning a captured stack for the
// JSX call site. The user frame sits between `react-stack-top-frame` (which
// is the Error message, not a frame) and `react_stack_bottom_frame`; the
// JSX factory itself (`jsxDEV` / `jsx` / `jsxs` / `createElement`) is the
// caller of the user frame and gets skipped too.
const REACT_FACTORY_FRAME = /^(?:Object\.|exports\.)?(?:jsx|jsxDEV|jsxs|jsxsDEV|createElement|react_stack_bottom_frame|react-stack-top-frame)$/;

interface ParsedFrame {
  function?: string;
  file: string;
  line: number;
  column?: number;
}

// V8 / Chrome: `    at <fn> (<url>:line:col)` or `    at <url>:line:col`
const V8_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/;
// SpiderMonkey / JSC: `<fn>@<url>:line:col`
const MOZ_FRAME = /^(.*?)@(.+?):(\d+):(\d+)$/;

function parseFrame(line: string): ParsedFrame | null {
  const v8 = V8_FRAME.exec(line);
  if (v8) {
    const [, fn, file, ln, col] = v8;
    return {
      function: fn || undefined,
      file,
      line: Number(ln),
      column: Number(col),
    };
  }
  const moz = MOZ_FRAME.exec(line);
  if (moz) {
    const [, fn, file, ln, col] = moz;
    return {
      function: fn || undefined,
      file,
      line: Number(ln),
      column: Number(col),
    };
  }
  return null;
}

function findUserFrame(stack: string | undefined): ParsedFrame | null {
  if (!stack) return null;
  const lines = stack.split("\n");
  for (const raw of lines) {
    const frame = parseFrame(raw);
    if (!frame) continue;
    if (frame.function && REACT_FACTORY_FRAME.test(frame.function)) continue;
    return frame;
  }
  return null;
}

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

function locationFromStackFrame(
  frame: ParsedFrame,
  symbol: string | undefined,
  strategy: SourceLocation["strategy"],
  confidence: SourceLocation["confidence"],
): SourceLocation {
  const loc: SourceLocation = {
    file: frame.file,
    line: frame.line,
    strategy,
    confidence,
  };
  if (typeof frame.column === "number") loc.column = frame.column;
  // Prefer the fiber's own symbol; fall back to the stack frame's function name.
  const sym = symbol || frame.function;
  if (sym) loc.symbol = sym;
  return loc;
}

function locationFor(
  fiber: FiberLike,
  fiberStrategy: SourceLocation["strategy"],
  stackStrategy: SourceLocation["strategy"],
  confidence: SourceLocation["confidence"],
): SourceLocation | null {
  const symbol = getSymbol(fiber);
  if (fiber._debugSource) {
    return locationFromDebugSource(fiber._debugSource, symbol, fiberStrategy, confidence);
  }
  if (fiber._debugStack) {
    const frame = findUserFrame(fiber._debugStack.stack);
    if (frame) {
      return locationFromStackFrame(frame, symbol, stackStrategy, confidence);
    }
  }
  return null;
}

function resolveFromFiber(fiber: FiberLike): SourceLocation[] {
  const out: SourceLocation[] = [];

  // Direct location of the JSX literal that rendered this element.
  const self = locationFor(fiber, "react-fiber", "react-fiber-stack", "high");
  if (self) out.push(self);

  // Owner chain: the components that contain this JSX. First few only.
  let owner: FiberLike | null | undefined = fiber._debugOwner;
  let depth = 0;
  while (owner && depth < MAX_OWNER_DEPTH) {
    const loc = locationFor(
      owner,
      "react-owner",
      "react-owner-stack",
      depth === 0 ? "medium" : "low",
    );
    if (loc) out.push(loc);
    owner = owner._debugOwner;
    depth++;
  }

  return out;
}

/**
 * Mutates each violation in place, attaching `source` candidates when a
 * React fiber with debug info is found on the violating element. No-op for
 * violations without an `element`, for non-React pages, and for production
 * builds (no `_debugSource` and no `_debugStack`). Never throws — failures
 * are swallowed silently.
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
