import { describe, expect, it } from "vitest";
import path from "node:path";
import { corePkgPath, loadCoreIIFE } from "./iife-source.js";

describe("corePkgPath", () => {
  it("derives package.json from a POSIX IIFE path", () => {
    const iife = "/home/u/node_modules/@accesslint/core/dist/index.iife.js";
    expect(corePkgPath(iife, path.posix)).toBe(
      "/home/u/node_modules/@accesslint/core/package.json",
    );
  });

  it("derives package.json from a Windows IIFE path (issue #4)", () => {
    const iife = "C:\\app\\node_modules\\@accesslint\\core\\dist\\index.iife.js";
    expect(corePkgPath(iife, path.win32)).toBe(
      "C:\\app\\node_modules\\@accesslint\\core\\package.json",
    );
  });
});

describe("loadCoreIIFE", () => {
  it("reads a valid version and non-empty bundle from the resolved core", () => {
    const { bytes, version } = loadCoreIIFE();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
