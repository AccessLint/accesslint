import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

let cached: { bytes: string; version: string } | null = null;

interface CorePackage {
  version?: string;
}

/**
 * Derive the path to @accesslint/core's package.json from the resolved IIFE
 * path (`.../core/dist/index.iife.js`). Uses path.dirname twice so it works
 * regardless of separator; `pathImpl` is injectable to exercise win32 paths
 * on POSIX hosts.
 */
export function corePkgPath(iifePath: string, pathImpl: typeof path = path): string {
  return pathImpl.join(pathImpl.dirname(pathImpl.dirname(iifePath)), "package.json");
}

/**
 * Version of the resolved @accesslint/core engine, without reading the IIFE
 * bytes. Returns "unknown" when core cannot be resolved (a broken install).
 */
export function coreEngineVersion(): string {
  if (cached !== null) return cached.version;
  try {
    const iifePath = require.resolve("@accesslint/core/iife");
    const pkg = JSON.parse(readFileSync(corePkgPath(iifePath), "utf8")) as CorePackage;
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function loadCoreIIFE(): { bytes: string; version: string } {
  if (cached !== null) return cached;
  const iifePath = require.resolve("@accesslint/core/iife");
  const bytes = readFileSync(iifePath, "utf8");
  const pkgPath = corePkgPath(iifePath);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as CorePackage;
  if (!pkg.version) {
    throw new Error(`@accesslint/core package.json at ${pkgPath} is missing 'version'`);
  }
  cached = { bytes, version: pkg.version };
  return cached;
}
