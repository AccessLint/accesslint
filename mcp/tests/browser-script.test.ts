import { describe, it, expect } from "vitest";
import { buildBrowserScript, newSessionToken } from "../src/lib/browser-script.js";

describe("buildBrowserScript", () => {
  it("returns a parseable function expression", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "deadbeef",
      coreOptions: {},
    });
    expect(() => new Function(`return (${script})`)).not.toThrow();
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

  it("includes the IIFE bundle when inject=true", () => {
    const script = buildBrowserScript({
      inject: true,
      sessionToken: "t",
      coreOptions: {},
    });
    // Bundle is ~165 KB; with inject=false it would be ~600 chars.
    expect(script.length).toBeGreaterThan(50_000);
    // Smoke check that the IIFE actually defines window.AccessLint somewhere.
    expect(script).toMatch(/AccessLint/);
  });

  it("omits the IIFE when inject=false", () => {
    const script = buildBrowserScript({
      inject: false,
      sessionToken: "t",
      coreOptions: {},
    });
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
