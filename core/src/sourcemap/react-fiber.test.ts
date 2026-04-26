import { describe, it, expect } from "vitest";
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

describe("attachReactFiberSource", () => {
  it("is a no-op on an empty array", () => {
    expect(() => attachReactFiberSource([])).not.toThrow();
  });

  it("does nothing for violations with no element", () => {
    const v = makeViolation(undefined);
    attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("does nothing when the element has no fiber attached", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const v = makeViolation(el);
    attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("populates source from _debugSource on the fiber", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const Component = function () {};
    (Component as unknown as { displayName: string }).displayName = "ProductCard";
    attachFiber(el, {
      type: Component,
      _debugSource: { fileName: "/src/components/ProductCard.tsx", lineNumber: 42, columnNumber: 7 },
    });

    const v = makeViolation(el);
    attachReactFiberSource([v]);

    expect(v.source).toBeDefined();
    expect(v.source).toHaveLength(1);
    expect(v.source![0]).toMatchObject({
      file: "/src/components/ProductCard.tsx",
      line: 42,
      column: 7,
      symbol: "ProductCard",
      strategy: "react-fiber",
      confidence: "high",
    });
  });

  it("walks the _debugOwner chain for enclosing components", () => {
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
    attachReactFiberSource([v]);

    expect(v.source).toHaveLength(3);
    expect(v.source![0]).toMatchObject({ file: "/src/Self.tsx", strategy: "react-fiber", confidence: "high" });
    expect(v.source![1]).toMatchObject({ file: "/src/Inner.tsx", strategy: "react-owner", confidence: "medium" });
    expect(v.source![2]).toMatchObject({ file: "/src/Outer.tsx", strategy: "react-owner", confidence: "low" });
  });

  it("omits column when fiber has no columnNumber", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, {
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1 },
    });

    const v = makeViolation(el);
    attachReactFiberSource([v]);

    expect(v.source![0]).toMatchObject({ file: "/src/X.tsx", line: 1, strategy: "react-fiber" });
    expect(v.source![0].column).toBeUndefined();
  });

  it("falls back gracefully when fiber has no _debugSource (production React)", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, { type: function Foo() {} }); // no _debugSource

    const v = makeViolation(el);
    attachReactFiberSource([v]);
    expect(v.source).toBeUndefined();
  });

  it("does not clobber an existing source array", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    attachFiber(el, {
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1, columnNumber: 1 },
    });

    const v: Violation = {
      ...makeViolation(el),
      source: [{ file: "/preset.tsx", line: 99, strategy: "sourcemap", confidence: "low" }],
    };
    attachReactFiberSource([v]);
    expect(v.source).toHaveLength(1);
    expect(v.source![0].file).toBe("/preset.tsx");
  });

  it("recognizes the legacy __reactInternalInstance$ key", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    (el as unknown as Record<string, unknown>)[`__reactInternalInstance$xyz`] = {
      _debugSource: { fileName: "/legacy.tsx", lineNumber: 3, columnNumber: 1 },
    };

    const v = makeViolation(el);
    attachReactFiberSource([v]);
    expect(v.source).toHaveLength(1);
    expect(v.source![0].file).toBe("/legacy.tsx");
  });

  it("uses displayName over function name when both are present", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    const Component = function Inner() {};
    (Component as unknown as { displayName: string }).displayName = "MyComponent";
    attachFiber(el, {
      type: Component,
      _debugSource: { fileName: "/src/X.tsx", lineNumber: 1, columnNumber: 1 },
    });

    const v = makeViolation(el);
    attachReactFiberSource([v]);
    expect(v.source![0].symbol).toBe("MyComponent");
  });

  describe("React 19 _debugStack fallback", () => {
    // Real-world stack from a Next.js 16 dev build (React 19). Top is the
    // synthetic message line; jsxDEV is React's factory; the user component
    // frame is what we want; everything below react_stack_bottom_frame is
    // React internals.
    const REACT19_STACK = [
      "Error: react-stack-top-frame",
      "    at exports.jsxDEV (http://localhost:3000/_next/static/chunks/app.js:1747:33)",
      "    at BuildTimesDashboardBroken (http://localhost:3000/_next/static/chunks/app.js:595:237)",
      "    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/react-dom.js:14816:24)",
      "    at renderWithHooksAgain (http://localhost:3000/_next/static/chunks/react-dom.js:4700:24)",
      "    at beginWork (http://localhost:3000/_next/static/chunks/react-dom.js:6702:24)",
    ].join("\n");

    it("populates source from _debugStack when _debugSource is missing", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const Component = function BuildTimesDashboardBroken() {};
      attachFiber(el, {
        type: Component,
        _debugStack: { stack: REACT19_STACK },
      });

      const v = makeViolation(el);
      attachReactFiberSource([v]);

      expect(v.source).toBeDefined();
      expect(v.source).toHaveLength(1);
      expect(v.source![0]).toMatchObject({
        file: "http://localhost:3000/_next/static/chunks/app.js",
        line: 595,
        column: 237,
        symbol: "BuildTimesDashboardBroken",
        strategy: "react-fiber-stack",
        confidence: "high",
      });
    });

    it("skips React factory frames (jsxDEV, jsx, jsxs, react_stack_bottom_frame)", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at exports.jsx (/react/jsx.js:2:1)",
        "    at jsxs (/react/jsx.js:3:1)",
        "    at MyComponent (/src/MyComponent.tsx:42:7)",
        "    at Object.react_stack_bottom_frame (/react-dom/render.js:1:1)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      attachReactFiberSource([v]);

      expect(v.source![0]).toMatchObject({
        file: "/src/MyComponent.tsx",
        line: 42,
        column: 7,
        symbol: "MyComponent",
        strategy: "react-fiber-stack",
      });
    });

    it("walks _debugOwner chain via _debugStack when _debugSource missing", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const ownerStack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at OuterPage (/src/Outer.tsx:5:2)",
      ].join("\n");
      const selfStack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at InnerCard (/src/Inner.tsx:20:6)",
      ].join("\n");
      attachFiber(el, {
        _debugStack: { stack: selfStack },
        _debugOwner: { _debugStack: { stack: ownerStack } },
      });

      const v = makeViolation(el);
      attachReactFiberSource([v]);

      expect(v.source).toHaveLength(2);
      expect(v.source![0]).toMatchObject({
        file: "/src/Inner.tsx",
        strategy: "react-fiber-stack",
        confidence: "high",
      });
      expect(v.source![1]).toMatchObject({
        file: "/src/Outer.tsx",
        strategy: "react-owner-stack",
        confidence: "medium",
      });
    });

    it("returns nothing when every stack frame is a React factory", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at Object.react_stack_bottom_frame (/react-dom/render.js:1:1)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      attachReactFiberSource([v]);
      expect(v.source).toBeUndefined();
    });

    it("prefers _debugSource over _debugStack when both are present", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      attachFiber(el, {
        _debugSource: { fileName: "/from-debug-source.tsx", lineNumber: 1, columnNumber: 1 },
        _debugStack: { stack: REACT19_STACK },
      });

      const v = makeViolation(el);
      attachReactFiberSource([v]);
      expect(v.source).toHaveLength(1);
      expect(v.source![0]).toMatchObject({
        file: "/from-debug-source.tsx",
        strategy: "react-fiber",
      });
    });

    it("parses SpiderMonkey/JSC frame format (fn@url:line:col)", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "jsxDEV@/react/jsx.js:1:1",
        "MyComponent@/src/MyComponent.tsx:42:7",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } });

      const v = makeViolation(el);
      attachReactFiberSource([v]);
      expect(v.source![0]).toMatchObject({
        file: "/src/MyComponent.tsx",
        line: 42,
        column: 7,
        symbol: "MyComponent",
        strategy: "react-fiber-stack",
      });
    });

    it("falls back to function name from stack when fiber has no displayName", () => {
      const doc = makeDoc("<div></div>");
      const el = doc.querySelector("div")!;
      const stack = [
        "Error: react-stack-top-frame",
        "    at exports.jsxDEV (/react/jsx.js:1:1)",
        "    at SomeNamedFn (/src/X.tsx:10:5)",
      ].join("\n");
      attachFiber(el, { _debugStack: { stack } }); // no `type`

      const v = makeViolation(el);
      attachReactFiberSource([v]);
      expect(v.source![0].symbol).toBe("SomeNamedFn");
    });
  });

  it("never throws if the fiber lookup raises", () => {
    const doc = makeDoc("<div></div>");
    const el = doc.querySelector("div")!;
    Object.defineProperty(el, "__reactFiber$bad", {
      enumerable: true,
      get() {
        throw new Error("boom");
      },
    });

    const v = makeViolation(el);
    expect(() => attachReactFiberSource([v])).not.toThrow();
    expect(v.source).toBeUndefined();
  });
});
