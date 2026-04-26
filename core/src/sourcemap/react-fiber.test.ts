import { describe, it, expect, vi, afterEach } from "vitest";
import {
  encode as encodeMappings,
  type SourceMapMappings,
} from "@jridgewell/sourcemap-codec";
import { makeDoc } from "../test-helpers";
import type { Violation } from "../rules/types";
import { attachReactFiberSource } from "./react-fiber";

function makeViolation(element?: Element): Violation {
  return {
    ruleId: "test/rule",
    selector: "div",
    html: "<div></div>",
    impact: "minor",
    message: "test",
    element,
  };
}

function attachFiber(node: Element, fiber: unknown): void {
  // Mirror React's internal naming: __reactFiber$<random>
  (node as unknown as Record<string, unknown>)[`__reactFiber$${Math.random().toString(36).slice(2)}`] = fiber;
}

/**
 * Build a minimal source map that maps generated `(genLine, genCol)` to
 * original `(originalFile, origLine, origCol)`. Lines/cols are 1-based at
 * the API surface; trace-mapping stores them 1-based for line and 0-based
 * for column internally.
 */
function buildSourceMap(opts: {
  generated: { line: number; column: number };
  original: { file: string; line: number; column: number };
  name?: string;
}): string {
  const genLineIdx = opts.generated.line - 1;
  const decoded: SourceMapMappings = [];
  for (let i = 0; i < genLineIdx; i++) decoded.push([]);
  // Single segment on the target line: [genCol, sourceIdx, origLine, origCol, nameIdx?]
  const origLineIdx = opts.original.line - 1;
  const origColIdx = opts.original.column - 1;
  decoded.push([
    opts.name
      ? [opts.generated.column - 1, 0, origLineIdx, origColIdx, 0]
      : [opts.generated.column - 1, 0, origLineIdx, origColIdx],
  ]);

  return JSON.stringify({
    version: 3,
    sources: [opts.original.file],
    names: opts.name ? [opts.name] : [],
    mappings: encodeMappings(decoded),
  });
}

/**
 * Stub `fetch` so chunk URLs return JS with a `# sourceMappingURL=...`
 * trailer pointing at an inline data URL containing the source map.
 */
function stubFetchWithMap(opts: {
  chunkUrl: string;
  generated: { line: number; column: number };
  original: { file: string; line: number; column: number };
  name?: string;
}): ReturnType<typeof vi.fn> {
  const map = buildSourceMap(opts);
  const dataUrl = `data:application/json;base64,${Buffer.from(map).toString("base64")}`;
  // The chunk content's structure is unimportant; we only need the trailer.
  const chunkBody = `(function(){})();\n//# sourceMappingURL=${dataUrl}\n`;
  const fetchMock = vi.fn(async (url: string | URL) => {
    if (String(url) === opts.chunkUrl) {
      return new Response(chunkBody, { status: 200 });
    }
    return new Response("", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("attachReactFiberSource", () => {
  it("is a no-op on an empty array", async () => {
    await expect(attachReactFiberSource([])).resolves.toBeUndefined();
  });

  it("does nothing for violations with no element", async () => {
    const v = makeViolation(undefined);
    await attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("does nothing when the element has no fiber attached", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const v = makeViolation(el);
    await attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("populates source from _debugSource on the fiber", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const Component = function () {};
    (Component as unknown as { displayName: string }).displayName = "ProductCard";
    attachFiber(el, {
      type: Component,
      _debugSource: { fileName: "/src/components/ProductCard.tsx", lineNumber: 42, columnNumber: 7 },
    });

    const v = makeViolation(el);
    await attachReactFiberSource([v]);

    expect(v.source).toBeDefined();
    expect(v.source).toHaveLength(1);
    expect(v.source![0]).toEqual({
      file: "/src/components/ProductCard.tsx",
      line: 42,
      column: 7,
      symbol: "ProductCard",
      ownerDepth: 0,
    });
  });

  it("does not fetch when _debugSource is present (React 18 path)", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    attachFiber(el, {
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1, columnNumber: 1 },
    });

    const v = makeViolation(el);
    await attachReactFiberSource([v]);

    expect(v.source).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("walks the _debugOwner chain via _debugSource", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const Outer = function () {};
    (Outer as unknown as { displayName: string }).displayName = "Outer";
    const Inner = function () {};
    (Inner as unknown as { displayName: string }).displayName = "Inner";
    const Self = function () {};
    (Self as unknown as { displayName: string }).displayName = "Self";

    const outerFiber = {
      type: Outer,
      _debugSource: { fileName: "/src/Outer.tsx", lineNumber: 5, columnNumber: 2 },
      _debugOwner: null,
    };
    const innerFiber = {
      type: Inner,
      _debugSource: { fileName: "/src/Inner.tsx", lineNumber: 10, columnNumber: 4 },
      _debugOwner: outerFiber,
    };
    const selfFiber = {
      type: Self,
      _debugSource: { fileName: "/src/Self.tsx", lineNumber: 20, columnNumber: 6 },
      _debugOwner: innerFiber,
    };
    attachFiber(el, selfFiber);

    const v = makeViolation(el);
    await attachReactFiberSource([v]);

    expect(v.source).toHaveLength(3);
    expect(v.source![0]).toMatchObject({ file: "/src/Self.tsx", ownerDepth: 0 });
    expect(v.source![1]).toMatchObject({ file: "/src/Inner.tsx", ownerDepth: 1 });
    expect(v.source![2]).toMatchObject({ file: "/src/Outer.tsx", ownerDepth: 2 });
  });

  it("omits column when fiber has no columnNumber", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, {
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1 },
    });

    const v = makeViolation(el);
    await attachReactFiberSource([v]);

    expect(v.source![0]).toMatchObject({ file: "/src/X.tsx", line: 1, ownerDepth: 0 });
    expect(v.source![0].column).toBeUndefined();
  });

  it("falls back gracefully when fiber has no _debugSource and no _debugStack", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, { type: function Foo() {} });

    const v = makeViolation(el);
    await attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("does not clobber an existing source array", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, {
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1, columnNumber: 1 },
    });

    const v: Violation = {
      ...makeViolation(el),
      source: [{ file: "/preset.tsx", line: 99, ownerDepth: 0 }],
    };
    await attachReactFiberSource([v]);
    expect(v.source).toHaveLength(1);
    expect(v.source![0].file).toBe("/preset.tsx");
  });

  it("recognizes the legacy __reactInternalInstance$ key", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    (el as unknown as Record<string, unknown>)[`__reactInternalInstance$xyz`] = {
      _debugSource: { fileName: "/legacy.tsx", lineNumber: 3, columnNumber: 1 },
    };

    const v = makeViolation(el);
    await attachReactFiberSource([v]);
    expect(v.source).toHaveLength(1);
    expect(v.source![0].file).toBe("/legacy.tsx");
  });

  it("uses displayName over function name when both are present", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const Component = function Inner() {};
    (Component as unknown as { displayName: string }).displayName = "MyComponent";
    attachFiber(el, {
      type: Component,
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1, columnNumber: 1 },
    });

    const v = makeViolation(el);
    await attachReactFiberSource([v]);
    expect(v.source![0].symbol).toBe("MyComponent");
  });

  describe("React 19 _debugStack path with sourcemap resolution", () => {
    it("resolves a chunk URL stack frame through its sourcemap", async () => {
      const chunkUrl = "http://localhost:3000/_next/static/chunks/app.js";
      stubFetchWithMap({
        chunkUrl,
        generated: { line: 595, column: 237 },
        original: { file: "src/components/BuildTimesDashboardBroken.tsx", line: 42, column: 7 },
      });

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const Component = function BuildTimesDashboardBroken() {};
      const stack = [
        "Error: react-stack-top-frame",
        `    at exports.jsxDEV (${chunkUrl}:1:33)`,
        `    at BuildTimesDashboardBroken (${chunkUrl}:595:237)`,
        "    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/react-dom.js:14816:24)",
      ].join("\n");
      attachFiber(el, { type: Component, _debugStack: { stack } });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);

      expect(v.source).toBeDefined();
      expect(v.source).toHaveLength(1);
      expect(v.source![0]).toMatchObject({
        file: "src/components/BuildTimesDashboardBroken.tsx",
        line: 42,
        column: 7,
        symbol: "BuildTimesDashboardBroken",
        ownerDepth: 0,
      });
    });

    it("drops the entry when the chunk fetch returns 404", async () => {
      const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (http://localhost:3000/chunks/app.js:1:1)",
        "    at MyComponent (http://localhost:3000/chunks/app.js:42:7)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);

      expect(v.source).toBeUndefined();
      expect(fetchMock).toHaveBeenCalled();
    });

    it("drops the entry when the chunk has no sourceMappingURL", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("(function(){})();", { status: 200 })),
      );

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at MyComponent (http://localhost:3000/chunks/app.js:42:7)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);
      expect(v.source).toBeUndefined();
    });

    it("resolves an external sourcemap URL relative to the chunk", async () => {
      const chunkUrl = "http://localhost:3000/chunks/app.js";
      const mapUrl = "http://localhost:3000/chunks/app.js.map";
      const map = buildSourceMap({
        generated: { line: 10, column: 5 },
        original: { file: "src/Card.tsx", line: 8, column: 3 },
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          if (String(url) === chunkUrl) {
            return new Response("(function(){})();\n//# sourceMappingURL=app.js.map\n", { status: 200 });
          }
          if (String(url) === mapUrl) {
            return new Response(map, { status: 200 });
          }
          return new Response("", { status: 404 });
        }),
      );

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = `Error\n    at Card (${chunkUrl}:10:5)`;
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);

      expect(v.source).toHaveLength(1);
      expect(v.source![0]).toMatchObject({
        file: "src/Card.tsx",
        line: 8,
        column: 3,
        ownerDepth: 0,
      });
    });

    it("caches sourcemap fetches across violations on the same chunk", async () => {
      const chunkUrl = "http://localhost:3000/chunks/app.js";
      const fetchMock = stubFetchWithMap({
        chunkUrl,
        generated: { line: 1, column: 1 },
        original: { file: "src/X.tsx", line: 1, column: 1 },
      });

      const doc = makeDoc("<div></div><div></div>");
      const els = Array.from(doc.querySelectorAll("div"));
      for (const el of els) {
        attachFiber(el, {
          _debugStack: { stack: `Error\n    at X (${chunkUrl}:1:1)` },
        });
      }

      const violations = els.map((el) => makeViolation(el));
      await attachReactFiberSource(violations);

      for (const v of violations) {
        expect(v.source![0]).toMatchObject({ file: "src/X.tsx", ownerDepth: 0 });
      }
      // One fetch for the chunk; map is inline, so no second fetch.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("walks the _debugOwner chain via _debugStack", async () => {
      const chunkUrl = "http://localhost:3000/chunks/app.js";
      // Build a map with two segments: line 20 → Inner.tsx, line 5 → Outer.tsx
      const decoded: SourceMapMappings = [];
      for (let i = 0; i < 4; i++) decoded.push([]);
      // line 5 (idx 4): col 1 → source 1 (Outer.tsx) line 5 col 1
      decoded.push([[0, 1, 4, 0]]);
      // lines 6..19 empty
      for (let i = 5; i < 19; i++) decoded.push([]);
      // line 20 (idx 19): col 5 → source 0 (Inner.tsx) line 10 col 4
      decoded.push([[4, 0, 9, 3]]);
      const map = JSON.stringify({
        version: 3,
        sources: ["src/Inner.tsx", "src/Outer.tsx"],
        names: [],
        mappings: encodeMappings(decoded),
      });
      const dataUrl = `data:application/json;base64,${Buffer.from(map).toString("base64")}`;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          if (String(url) === chunkUrl) {
            return new Response(`(function(){})();\n//# sourceMappingURL=${dataUrl}\n`, { status: 200 });
          }
          return new Response("", { status: 404 });
        }),
      );

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const ownerStack = `Error\n    at OuterPage (${chunkUrl}:5:1)`;
      const selfStack = `Error\n    at InnerCard (${chunkUrl}:20:5)`;
      attachFiber(el, {
        _debugStack: { stack: selfStack },
        _debugOwner: { _debugStack: { stack: ownerStack } },
      });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);

      expect(v.source).toHaveLength(2);
      expect(v.source![0]).toMatchObject({ file: "src/Inner.tsx", ownerDepth: 0 });
      expect(v.source![1]).toMatchObject({ file: "src/Outer.tsx", ownerDepth: 1 });
    });

    it("returns nothing when every stack frame is a React factory", async () => {
      const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at Object.react_stack_bottom_frame (/react-dom/render.js:1:1)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);
      expect(v.source).toBeUndefined();
      // No user frame found, so we never even fetch.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("prefers _debugSource over _debugStack when both are present", async () => {
      const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
      vi.stubGlobal("fetch", fetchMock);

      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      attachFiber(el, {
        _debugSource: { fileName: "/from-debug-source.tsx", lineNumber: 1, columnNumber: 1 },
        _debugStack: { stack: "Error\n    at X (http://localhost/chunks/app.js:1:1)" },
      });

      const v = makeViolation(el);
      await attachReactFiberSource([v]);
      expect(v.source).toHaveLength(1);
      expect(v.source![0]).toMatchObject({ file: "/from-debug-source.tsx", ownerDepth: 0 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("never throws if the fiber lookup raises", async () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    Object.defineProperty(el, "__reactFiber$bad", {
      enumerable: true,
      get() {
        throw new Error("boom");
      },
    });

    const v = makeViolation(el);
    await expect(attachReactFiberSource([v])).resolves.toBeUndefined();
    expect(v.source).toBeUndefined();
  });
});
