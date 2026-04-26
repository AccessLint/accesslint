import { describe, it, expect } from "vitest";
import { buildBrowserScript, newSessionToken } from "../src/lib/browser-script.js";

describe("buildBrowserScript", () => {
  it("returns a parseable async function expression", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "deadbeef",
      coreOptions: {},
    });
    // Async function bodies are syntactically valid; AsyncFunction's
    // constructor enforces the same parsing rules as a real evaluation.
    const AsyncFn = (async () => {}).constructor as FunctionConstructor;
    expect(() => new AsyncFn(`return (${script})`)).not.toThrow();
    // Top-level form: arrow async function expression.
    expect(script.trimStart().startsWith("async () => {")).toBe(true);
  });

  it("embeds the session token verbatim", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "abc12345",
      coreOptions: {},
    });
    expect(script).toContain('"abc12345"');
  });

  it("embeds the core options as JSON", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: { includeAAA: true, disabledRules: ["text-alternatives/img-alt"] },
    });
    expect(script).toContain('"includeAAA":true');
    expect(script).toContain('"disabledRules":["text-alternatives/img-alt"]');
  });

  it("includes a CDN fetch bootstrap when inject=true", () => {
    const script = buildBrowserScript({
      inject: true,
      sessionToken: "t",
      coreOptions: {},
    });
    // CDN-load replaces inlining: the script fetches the IIFE from jsDelivr
    // at a version-pinned URL and evaluates it in-page.
    expect(script).toContain("https://cdn.jsdelivr.net/npm/@accesslint/core@");
    expect(script).toContain("/dist/index.iife.js");
    expect(script).toContain("await fetch");
    expect(script).toContain("(0, eval)(__code)");
    // Bootstrap is small — well under what an inlined IIFE would weigh.
    expect(script.length).toBeLessThan(3_000);
  });

  it("omits the CDN fetch when inject=false", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
    expect(script).not.toContain("cdn.jsdelivr.net");
    expect(script).not.toContain("await fetch");
    expect(script.length).toBeLessThan(2_000);
  });

  it("returns a no-AccessLint guard when inject=false and the page never loaded it", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
    // The script must surface a helpful error rather than throwing
    // ReferenceError when window.AccessLint is missing.
    expect(script).toContain("window.AccessLint is not loaded");
  });

  it("surfaces a clear error when the CDN fetch fails", () => {
    const script = buildBrowserScript({
      inject: true,
      sessionToken: "t",
      coreOptions: {},
    });
    expect(script).toContain("Failed to fetch @accesslint/core IIFE");
    expect(script).toContain("Failed to load @accesslint/core IIFE from CDN");
  });
});

describe("buildBrowserScript source_map", () => {
  it("includes the fiber post-processor by default", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
    expect(script).toContain("attachReactFiberSource");
  });

  it("includes the fiber post-processor when sourceMap='fiber'", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      sourceMap: "fiber",
      coreOptions: {},
    });
    expect(script).toContain("attachReactFiberSource");
  });

  it("omits the fiber post-processor when sourceMap='off'", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      sourceMap: "off",
      coreOptions: {},
    });
    expect(script).not.toContain("attachReactFiberSource");
  });

  it("projects v.source through the in-page mapping", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
    expect(script).toContain("source: v.source");
  });

  it("guards the fiber call so missing exports don't throw", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
    // Older core versions may not export attachReactFiberSource — check
    // the typeof guard is in place.
    expect(script).toContain('typeof window.AccessLint.attachReactFiberSource === "function"');
  });
});

describe("newSessionToken", () => {
  it("produces 8-hex tokens", () => {
    for (let i = 0; i < 5; i++) {
      const token = newSessionToken();
      expect(token).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("doesn't repeat across calls", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) tokens.add(newSessionToken());
    expect(tokens.size).toBe(100);
  });
});
