import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);

/**
 * jsDelivr serves any published npm package at a predictable URL with
 * permissive CORS. Pinning to the same `@accesslint/core` version this MCP
 * was installed against keeps the in-page audit code in lock-step with the
 * server's expectations.
 *
 * Trade-off: pages with a strict Content-Security-Policy that disallows
 * connecting to `cdn.jsdelivr.net` will see the bootstrap fetch fail. In
 * that case the agent should fall back to static `audit_html` / `audit_file`.
 */
const CDN_HOST = "https://cdn.jsdelivr.net";

/**
 * When set, the bootstrap inlines the IIFE from the resolved local
 * `@accesslint/core/iife` path instead of fetching from jsDelivr. Used for
 * dev against an unpublished core build.
 */
const LOCAL_IIFE_ENV = "ACCESSLINT_MCP_USE_LOCAL_IIFE";

let cachedCoreVersion: string | null = null;
let cachedLocalIife: string | null = null;

function useLocalIife(): boolean {
  const v = process.env[LOCAL_IIFE_ENV];
  return v === "1" || v === "true";
}

function loadCoreVersion(): string {
  if (cachedCoreVersion !== null) return cachedCoreVersion;
  // @accesslint/core's `exports` map doesn't expose `package.json` directly,
  // so resolve via the published `./iife` entry and walk up two directories
  // (dist/index.iife.js → package.json sibling).
  const iifePath = require.resolve("@accesslint/core/iife");
  const pkgPath = join(dirname(dirname(iifePath)), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
  if (!pkg.version) {
    throw new Error(`@accesslint/core package.json at ${pkgPath} is missing 'version'`);
  }
  cachedCoreVersion = pkg.version;
  return cachedCoreVersion;
}

function loadLocalIife(): string {
  if (cachedLocalIife !== null) return cachedLocalIife;
  const iifePath = require.resolve("@accesslint/core/iife");
  cachedLocalIife = readFileSync(iifePath, "utf8");
  return cachedLocalIife;
}

function iifeUrl(version: string): string {
  return `${CDN_HOST}/npm/@accesslint/core@${version}/dist/index.iife.js`;
}

export type SourceMapMode = "off" | "fiber";

export interface BuildScriptOptions {
  inject: boolean;
  sessionToken: string;
  /** When "fiber" (default), attach React DevTools fiber source locations to violations. */
  sourceMap?: SourceMapMode;
  coreOptions: {
    disabledRules?: string[];
    includeAAA?: boolean;
    componentMode?: boolean;
    locale?: string;
  };
}

export function newSessionToken(): string {
  return randomBytes(4).toString("hex");
}

/**
 * Build the async function expression the agent pastes into a browser MCP's
 * evaluate tool. When `inject` is true, the function body fetches the
 * @accesslint/core IIFE from jsDelivr and evaluates it in-page so
 * `window.AccessLint` is defined; when false, it relies on a prior
 * injection (same browser session, no reload). The bootstrap is a few
 * hundred bytes either way — the IIFE is no longer inlined.
 */
export function buildBrowserScript(opts: BuildScriptOptions): string {
  const optsJson = JSON.stringify(opts.coreOptions);
  const tokenJson = JSON.stringify(opts.sessionToken);
  const sourceMap: SourceMapMode = opts.sourceMap ?? "fiber";

  let bootstrap = "";
  if (opts.inject) {
    if (useLocalIife()) {
      // Dev mode: inline the local workspace's built IIFE so the page
      // sees unpublished changes (e.g. attachReactFiberSource) without a
      // CDN round-trip. Inflates the script payload by ~165 KB; only
      // used when ACCESSLINT_MCP_USE_LOCAL_IIFE=1.
      const inlineIife = JSON.stringify(loadLocalIife());
      bootstrap = `
    if (typeof window.AccessLint === "undefined") {
      try {
        (0, eval)(${inlineIife});
      } catch (err) {
        return { sessionToken: __token, error: "Failed to evaluate local @accesslint/core IIFE: " + String((err && err.message) || err) };
      }
    }`;
    } else {
      const cdnUrl = JSON.stringify(iifeUrl(loadCoreVersion()));
      bootstrap = `
    if (typeof window.AccessLint === "undefined") {
      try {
        const __resp = await fetch(${cdnUrl});
        if (!__resp.ok) {
          return { sessionToken: __token, error: "Failed to fetch @accesslint/core IIFE: HTTP " + __resp.status };
        }
        const __code = await __resp.text();
        // Indirect eval runs in global scope, so the IIFE's top-level
        // \`var AccessLint = ...\` attaches to globalThis. \`new Function(code)()\`
        // would scope it to a fresh function and leave window.AccessLint undefined.
        (0, eval)(__code);
      } catch (err) {
        return { sessionToken: __token, error: "Failed to load @accesslint/core IIFE from CDN: " + String((err && err.message) || err) };
      }
    }`;
    }
  }

  const sourceMapBlock =
    sourceMap === "fiber"
      ? `
    if (typeof window.AccessLint.attachReactFiberSource === "function") {
      try { window.AccessLint.attachReactFiberSource(raw.violations); } catch (e) { /* best-effort */ }
    }`
      : "";

  return `async () => {
  const __opts = ${optsJson};
  const __token = ${tokenJson};
  try {${bootstrap}
    if (typeof window.AccessLint === "undefined") {
      return { sessionToken: __token, error: "window.AccessLint is not loaded; re-run audit_browser_script with inject=true" };
    }
    const raw = window.AccessLint.runAudit(document, __opts);${sourceMapBlock}
    return {
      sessionToken: __token,
      url: raw.url,
      timestamp: raw.timestamp,
      ruleCount: raw.ruleCount,
      skippedRules: raw.skippedRules || [],
      violations: raw.violations.map((v) => ({
        ruleId: v.ruleId,
        selector: v.selector,
        html: v.html,
        impact: v.impact,
        message: v.message,
        source: v.source,
      })),
    };
  } catch (err) {
    return { sessionToken: __token, error: String((err && err.message) || err) };
  }
}`;
}
