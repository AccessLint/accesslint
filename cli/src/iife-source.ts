import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);

let cached: { bytes: string; version: string } | null = null;

interface CorePackage {
  version?: string;
}

export function loadCoreIIFE(): { bytes: string; version: string } {
  if (cached !== null) return cached;
  const iifePath = require.resolve("@accesslint/core/iife");
  const bytes = readFileSync(iifePath, "utf8");
  const pkgPath = iifePath.replace(/\/dist\/[^/]+$/, "/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as CorePackage;
  if (!pkg.version) {
    throw new Error(`@accesslint/core package.json at ${pkgPath} is missing 'version'`);
  }
  cached = { bytes, version: pkg.version };
  return cached;
}
