import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import type { SourceLocation, Violation } from "../rules/types";

/**
 * React DevTools-aware source resolver. For each violating element, walks
 * up the React fiber to find the JSX literal that rendered it, plus a small
 * trail of enclosing components. Every entry returned in `Violation.source`
 * is a real source-file location — bundled chunk URLs are resolved through
 * the matching `.js.map` before reaching the consumer.
 *
 * Two paths into the call site:
 * - React 18 dev: fibers carry `_debugSource` ({ fileName, lineNumber, columnNumber })
 *   directly. No resolution needed.
 * - React 19 dev: fibers carry `_debugStack` (a captured Error). We pick the
 *   user frame from the stack — it points at a bundled chunk URL — then walk
 *   the chunk's sourcemap to recover the source-file location.
 *
 * Requirements: page is running React with the JSX `__source` transform
 * (default in CRA, Next dev, Vite + React) and serves sourcemaps for its
 * dev chunks (default in all the above). Non-React pages and production
 * builds silently no-op.
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
const REACT_FACTORY_FRAME =
  /^(?:Object\.|exports\.)?(?:jsx|jsxDEV|jsxs|jsxsDEV|createElement|react_stack_bottom_frame|react-stack-top-frame)$/;

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
    return { function: fn || undefined, file, line: Number(ln), column: Number(col) };
  }
  const moz = MOZ_FRAME.exec(line);
  if (moz) {
    const [, fn, file, ln, col] = moz;
    return { function: fn || undefined, file, line: Number(ln), column: Number(col) };
  }
  return null;
}

function findUserFrame(stack: string | undefined): ParsedFrame | null {
  if (!stack) return null;
  for (const raw of stack.split("\n")) {
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

// --- Sourcemap resolution ------------------------------------------------

const SOURCEMAP_URL_RE = /\/[/*]#\s*sourceMappingURL\s*=\s*([^\s'"]+)/;
const DATA_URL_PREFIX = /^data:application\/json[^,]*,/;

// Cache *promises*, not values, so concurrent violations on the same chunk
// share a single in-flight fetch instead of racing.
type ResolverCache = Map<string, Promise<TraceMap | null>>;

async function fetchText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function decodeDataUrl(url: string): string | null {
  // data:application/json[;charset=utf-8][;base64],...
  const isBase64 = /;base64,/.test(url);
  const body = url.replace(DATA_URL_PREFIX, "");
  try {
    if (isBase64) {
      // Browsers: atob → binary string; assume UTF-8 JSON content.
      return decodeURIComponent(escape(atob(body)));
    }
    return decodeURIComponent(body);
  } catch {
    return null;
  }
}

async function fetchAndParseMap(chunkUrl: string): Promise<TraceMap | null> {
  const code = await fetchText(chunkUrl);
  if (!code) return null;

  // Last sourceMappingURL wins (in case bundlers append to existing comments).
  let mapUrl: string | null = null;
  let match: RegExpExecArray | null;
  const re = new RegExp(SOURCEMAP_URL_RE.source, "g");
  while ((match = re.exec(code)) !== null) {
    mapUrl = match[1];
  }
  if (!mapUrl) return null;

  let mapText: string | null;
  if (mapUrl.startsWith("data:")) {
    mapText = decodeDataUrl(mapUrl);
  } else {
    const absolute = new URL(mapUrl, chunkUrl).toString();
    mapText = await fetchText(absolute);
  }
  if (!mapText) return null;

  try {
    return new TraceMap(mapText);
  } catch {
    return null;
  }
}

function loadTraceMap(chunkUrl: string, cache: ResolverCache): Promise<TraceMap | null> {
  const existing = cache.get(chunkUrl);
  if (existing) return existing;
  const promise = fetchAndParseMap(chunkUrl);
  cache.set(chunkUrl, promise);
  return promise;
}

async function resolveFrame(
  frame: ParsedFrame,
  cache: ResolverCache,
): Promise<{ file: string; line: number; column?: number; symbol?: string } | null> {
  const tm = await loadTraceMap(frame.file, cache);
  if (!tm) return null;

  // trace-mapping uses 1-based lines, 0-based columns; stack frames give us
  // 1-based columns, so subtract one.
  const orig = originalPositionFor(tm, {
    line: frame.line,
    column: typeof frame.column === "number" ? Math.max(0, frame.column - 1) : 0,
  });
  if (!orig.source || typeof orig.line !== "number") return null;

  const out: { file: string; line: number; column?: number; symbol?: string } = {
    file: orig.source,
    line: orig.line,
  };
  if (typeof orig.column === "number") out.column = orig.column + 1;
  if (orig.name) out.symbol = orig.name;
  return out;
}

// --- Per-fiber location resolution --------------------------------------

async function locationFor(
  fiber: FiberLike,
  ownerDepth: number,
  cache: ResolverCache,
): Promise<SourceLocation | null> {
  const symbol = getSymbol(fiber);

  // React 18 dev: _debugSource is already a source-file location.
  if (fiber._debugSource) {
    const loc: SourceLocation = {
      file: fiber._debugSource.fileName,
      line: fiber._debugSource.lineNumber,
      ownerDepth,
    };
    if (typeof fiber._debugSource.columnNumber === "number") {
      loc.column = fiber._debugSource.columnNumber;
    }
    if (symbol) loc.symbol = symbol;
    return loc;
  }

  // React 19 dev: parse stack, then walk sourcemap.
  if (fiber._debugStack) {
    const frame = findUserFrame(fiber._debugStack.stack);
    if (!frame) return null;
    const resolved = await resolveFrame(frame, cache);
    if (!resolved) return null;
    const loc: SourceLocation = {
      file: resolved.file,
      line: resolved.line,
      ownerDepth,
    };
    if (typeof resolved.column === "number") loc.column = resolved.column;
    // Prefer fiber-derived symbol over sourcemap name; sourcemap names tend
    // to be the JSX factory ("jsxDEV") rather than the component.
    const sym = symbol || resolved.symbol || frame.function;
    if (sym) loc.symbol = sym;
    return loc;
  }

  return null;
}

async function resolveFromFiber(
  fiber: FiberLike,
  cache: ResolverCache,
): Promise<SourceLocation[]> {
  const out: SourceLocation[] = [];

  const self = await locationFor(fiber, 0, cache);
  if (self) out.push(self);

  let owner: FiberLike | null | undefined = fiber._debugOwner;
  let depth = 1;
  while (owner && depth <= MAX_OWNER_DEPTH) {
    const loc = await locationFor(owner, depth, cache);
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
 * builds (no `_debugSource` and no `_debugStack`). Resolves bundled-chunk
 * URLs through their `.js.map` so every entry in the resulting array is a
 * source-file location. Never throws — failures are swallowed silently.
 */
export async function attachReactFiberSource(violations: Violation[]): Promise<void> {
  if (!violations || violations.length === 0) return;

  const cache: ResolverCache = new Map();

  await Promise.all(
    violations.map(async (violation) => {
      if (!violation.element) return;
      if (violation.source && violation.source.length > 0) return; // don't clobber

      try {
        const fiber = getFiberFromNode(violation.element);
        if (!fiber) return;
        const locations = await resolveFromFiber(fiber, cache);
        if (locations.length > 0) violation.source = locations;
      } catch {
        // Intentionally ignored — source mapping is best-effort.
      }
    }),
  );
}
