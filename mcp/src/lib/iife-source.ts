import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);

let cached: { bytes: string; version: string } | null = null;

interface CorePackage {
  version?: string;
}

/**
 * Read the @accesslint/core IIFE from the locally-installed package and cache
 * it in memory. Used by tools that push the IIFE through CDP — `audit_live`
 * uses this to inject without paying agent-context cost or hitting page CSP.
 */
export function loadCoreIIFE(): { bytes: string; version: string } {
  if (cached !== null) return cached;
  const iifePath = require.resolve("@accesslint/core/iife");
  const bytes = readFileSync(iifePath, "utf8");
  // Resolve version via package.json (sits two dirs up from the IIFE).
  const pkgPath = iifePath.replace(/\/dist\/[^/]+$/, "/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as CorePackage;
  if (!pkg.version) {
    throw new Error(`@accesslint/core package.json at ${pkgPath} is missing 'version'`);
  }
  cached = { bytes, version: pkg.version };
  return cached;
}
