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

let cachedCoreVersion: string | null = null;

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

function iifeUrl(version: string): string {
  return `${CDN_HOST}/npm/@accesslint/core@${version}/dist/index.iife.js`;
}

export interface BuildScriptOptions {
  inject: boolean;
  sessionToken: string;
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
  const cdnUrl = opts.inject ? JSON.stringify(iifeUrl(loadCoreVersion())) : null;

  const bootstrap = cdnUrl
    ? `
    if (typeof window.AccessLint === "undefined") {
      try {
        const __resp = await fetch(${cdnUrl});
        if (!__resp.ok) {
          return { sessionToken: __token, error: "Failed to fetch @accesslint/core IIFE: HTTP " + __resp.status };
        }
        const __code = await __resp.text();
        new Function(__code)();
      } catch (err) {
        return { sessionToken: __token, error: "Failed to load @accesslint/core IIFE from CDN: " + String((err && err.message) || err) };
      }
    }`
    : "";

  return `async () => {
  const __opts = ${optsJson};
  const __token = ${tokenJson};
  try {${bootstrap}
    if (typeof window.AccessLint === "undefined") {
      return { sessionToken: __token, error: "window.AccessLint is not loaded; re-run audit_browser_script with inject=true" };
    }
    const raw = window.AccessLint.runAudit(document, __opts);
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
      })),
    };
  } catch (err) {
    return { sessionToken: __token, error: String((err && err.message) || err) };
  }
}`;
}
