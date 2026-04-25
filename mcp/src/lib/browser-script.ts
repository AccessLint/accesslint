import { createRequire } from "node:module";
import { readFileSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);

const MAX_IIFE_BYTES = 1 * 1024 * 1024;

let cachedIife: string | null = null;

function loadIife(): string {
  if (cachedIife !== null) return cachedIife;
  const path = require.resolve("@accesslint/core/iife");
  const size = statSync(path).size;
  if (size > MAX_IIFE_BYTES) {
    throw new Error(
      `@accesslint/core IIFE bundle is ${size} bytes (cap ${MAX_IIFE_BYTES}); refusing to inline`,
    );
  }
  cachedIife = readFileSync(path, "utf8");
  return cachedIife;
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
 * Build the function-expression string the agent pastes into a browser MCP's
 * evaluate tool. When `inject` is true, the function body includes the full
 * @accesslint/core IIFE so `window.AccessLint` is guaranteed to exist; when
 * false, it relies on a prior injection (same browser session, no reload).
 */
export function buildBrowserScript(opts: BuildScriptOptions): string {
  const optsJson = JSON.stringify(opts.coreOptions);
  const tokenJson = JSON.stringify(opts.sessionToken);
  const iifeBlock = opts.inject ? loadIife() : "";

  return `() => {
${iifeBlock}
  const __opts = ${optsJson};
  const __token = ${tokenJson};
  try {
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
