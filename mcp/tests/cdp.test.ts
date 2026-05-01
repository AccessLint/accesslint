import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseEndpoint,
  findPageTarget,
  buildAuditExpression,
  type TargetInfo,
} from "../src/lib/cdp.js";
import { loadCoreIIFE } from "../src/lib/iife-source.js";

describe("parseEndpoint", () => {
  const original = {
    endpoint: process.env.ACCESSLINT_CDP_ENDPOINT,
    port: process.env.ACCESSLINT_CDP_PORT,
  };

  beforeEach(() => {
    delete process.env.ACCESSLINT_CDP_ENDPOINT;
    delete process.env.ACCESSLINT_CDP_PORT;
  });

  afterEach(() => {
    if (original.endpoint !== undefined) process.env.ACCESSLINT_CDP_ENDPOINT = original.endpoint;
    if (original.port !== undefined) process.env.ACCESSLINT_CDP_PORT = original.port;
  });

  it("defaults to 127.0.0.1:9222 when nothing is provided", () => {
    expect(parseEndpoint(undefined)).toEqual({ host: "127.0.0.1", port: 9222 });
  });

  it("honors ACCESSLINT_CDP_PORT when no input is given", () => {
    process.env.ACCESSLINT_CDP_PORT = "9333";
    expect(parseEndpoint(undefined)).toEqual({ host: "127.0.0.1", port: 9333 });
  });

  it("honors ACCESSLINT_CDP_ENDPOINT when no input is given", () => {
    process.env.ACCESSLINT_CDP_ENDPOINT = "host.local:7777";
    expect(parseEndpoint(undefined)).toEqual({ host: "host.local", port: 7777 });
  });

  it("parses host:port", () => {
    expect(parseEndpoint("example.com:8000")).toEqual({ host: "example.com", port: 8000 });
  });

  it("strips http:// scheme", () => {
    expect(parseEndpoint("http://localhost:9000")).toEqual({ host: "localhost", port: 9000 });
  });

  it("strips ws:// scheme", () => {
    expect(parseEndpoint("ws://localhost:9000")).toEqual({ host: "localhost", port: 9000 });
  });

  it("strips a trailing path", () => {
    expect(parseEndpoint("http://localhost:9222/devtools/browser/abc")).toEqual({
      host: "localhost",
      port: 9222,
    });
  });

  it("explicit input overrides env vars", () => {
    process.env.ACCESSLINT_CDP_ENDPOINT = "host.local:7777";
    expect(parseEndpoint("override:9999")).toEqual({ host: "override", port: 9999 });
  });

  it("rejects malformed input", () => {
    expect(() => parseEndpoint("not-an-endpoint:abc")).toThrow(/Could not parse/);
  });
});

describe("findPageTarget", () => {
  const targets: TargetInfo[] = [
    { id: "a", type: "page", url: "http://localhost:3000/" },
    { id: "b", type: "page", url: "http://localhost:3000/foo" },
    { id: "c", type: "iframe", url: "http://localhost:3000/iframe" },
    { id: "d", type: "service_worker", url: "http://localhost:3000/sw.js" },
  ];

  it("matches a page target by exact URL", () => {
    expect(findPageTarget(targets, "http://localhost:3000/foo")?.id).toBe("b");
  });

  it("falls back to URL prefix match", () => {
    expect(findPageTarget(targets, "http://localhost:3000")?.id).toBe("a");
  });

  it("ignores non-page targets even on a prefix match", () => {
    // The iframe and service_worker targets share the same prefix as page "a";
    // findPageTarget must skip them.
    const t = findPageTarget(targets, "http://localhost:3000");
    expect(t?.type).toBe("page");
  });

  it("returns undefined when no target matches", () => {
    expect(findPageTarget(targets, "http://other.example/")).toBeUndefined();
  });
});

describe("buildAuditExpression", () => {
  const { bytes } = loadCoreIIFE();

  it("includes the IIFE bytes verbatim", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: {},
      sourceMap: "off",
    });
    expect(expr).toContain(bytes);
  });

  it("embeds core options as JSON", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: { includeAAA: true, disabledRules: ["text-alternatives/img-alt"] },
      sourceMap: "off",
    });
    expect(expr).toContain('"includeAAA":true');
    expect(expr).toContain('"disabledRules":["text-alternatives/img-alt"]');
  });

  it("calls attachReactFiberSource in the wrapper when sourceMap is 'fiber'", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: {},
      sourceMap: "fiber",
    });
    // The IIFE itself defines attachReactFiberSource, so plain substring
    // search is ambiguous. The wrapper-only marker is the conditional call.
    expect(expr).toContain("typeof window.AccessLint.attachReactFiberSource");
  });

  it("omits the wrapper's attach call when sourceMap is 'off'", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: {},
      sourceMap: "off",
    });
    expect(expr).not.toContain("typeof window.AccessLint.attachReactFiberSource");
  });

  it("ends in an awaitable async IIFE invocation", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: {},
      sourceMap: "off",
    });
    // The expression's value is the trailing async IIFE call, so CDP
    // Runtime.evaluate with awaitPromise:true can resolve it.
    expect(expr.trimEnd().endsWith(")()")).toBe(true);
  });

  it("produces a syntactically valid script body", () => {
    const expr = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: {},
      sourceMap: "fiber",
    });
    // Function constructor parses the body as a script, mirroring how
    // Runtime.evaluate handles its `expression` argument.
    expect(() => new Function(expr)).not.toThrow();
  });
});

describe("loadCoreIIFE", () => {
  it("returns non-empty IIFE bytes and a semver-shaped version", () => {
    const { bytes, version } = loadCoreIIFE();
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("caches subsequent calls (same object identity)", () => {
    const a = loadCoreIIFE();
    const b = loadCoreIIFE();
    expect(a).toBe(b);
  });
});
