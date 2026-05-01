import CDP from "chrome-remote-interface";
import * as chromeLauncher from "chrome-launcher";
import type { AuditResult, Violation } from "@accesslint/core";
import { loadCoreIIFE } from "./iife-source.js";

/**
 * Direct CDP attachment for the live-DOM audit flow. The MCP connects to a
 * running Chrome via the DevTools Protocol, finds (or creates) a page target,
 * pushes the @accesslint/core IIFE through `Runtime.evaluate`, and runs the
 * audit in-page. The result returns as a small JSON payload — the IIFE bytes
 * never enter the agent's conversation context.
 *
 * Why CDP eval bypasses page CSP:
 * `Runtime.evaluate` runs in the inspector's privileged context, so the
 * initial expression executes regardless of `script-src` or `unsafe-eval`.
 * No `Page.setBypassCSP` needed; no network fetch from the page.
 */

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9222;
const NAVIGATION_TIMEOUT_MS = 15_000;
const WAIT_FOR_DEFAULT_MS = 10_000;
const WAIT_POLL_INTERVAL_MS = 100;

export type SourceMapMode = "off" | "fiber";

export interface RunLiveAuditOptions {
  url: string;
  cdpEndpoint?: string;
  attachExisting?: boolean;
  waitFor?: string;
  waitTimeoutMs?: number;
  sourceMap?: SourceMapMode;
  coreOptions: {
    disabledRules?: string[];
    includeAAA?: boolean;
    componentMode?: boolean;
    locale?: string;
  };
}

export type RunLiveAuditOutcome =
  | { ok: true; result: AuditResult }
  | { ok: false; error: string };

interface Endpoint {
  host: string;
  port: number;
}

export function parseEndpoint(input: string | undefined): Endpoint {
  const fromEnv = process.env.ACCESSLINT_CDP_ENDPOINT;
  const portFromEnv = process.env.ACCESSLINT_CDP_PORT;
  const raw = input ?? fromEnv;

  if (!raw) {
    return {
      host: DEFAULT_HOST,
      port: portFromEnv ? Number(portFromEnv) : DEFAULT_PORT,
    };
  }

  // Accept "host:port", "http://host:port", or "ws://host:port".
  let stripped = raw.replace(/^(https?|wss?):\/\//, "");
  // Drop any path component (e.g. "/devtools/browser/<id>").
  stripped = stripped.split("/")[0]!;
  const [host, portStr] = stripped.split(":");
  const port = portStr ? Number(portStr) : DEFAULT_PORT;
  if (!host || Number.isNaN(port)) {
    throw new Error(
      `Could not parse CDP endpoint "${raw}". Expected "host:port" or "http://host:port".`,
    );
  }
  return { host, port };
}

export interface TargetInfo {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

async function listTargets(ep: Endpoint): Promise<TargetInfo[]> {
  // CDP.List exists in chrome-remote-interface but is loosely typed; we want
  // the URL-shape directly.
  const res = (await CDP.List({ host: ep.host, port: ep.port })) as TargetInfo[];
  return res;
}

export function findPageTarget(targets: TargetInfo[], url: string): TargetInfo | undefined {
  // Match by exact URL first, then by URL prefix (handles trailing slashes /
  // hash/query drift).
  const exact = targets.find((t) => t.type === "page" && t.url === url);
  if (exact) return exact;
  return targets.find((t) => t.type === "page" && t.url.startsWith(url));
}

export function buildAuditExpression(opts: {
  iifeBytes: string;
  coreOptions: RunLiveAuditOptions["coreOptions"];
  sourceMap: SourceMapMode;
}): string {
  const optsJson = JSON.stringify(opts.coreOptions);
  const fiberBlock =
    opts.sourceMap === "fiber"
      ? `
        if (typeof window.AccessLint.attachReactFiberSource === "function") {
          try { await window.AccessLint.attachReactFiberSource(__r.violations); } catch (_e) {}
        }`
      : "";

  // The IIFE assigns to globalThis.AccessLint; the trailing async IIFE runs
  // the audit and serializes a small JSON payload.
  return `${opts.iifeBytes}
;(async () => {
  try {
    const __r = window.AccessLint.runAudit(document, ${optsJson});${fiberBlock}
    return JSON.stringify({
      ok: true,
      url: __r.url,
      timestamp: __r.timestamp,
      ruleCount: __r.ruleCount,
      skippedRules: __r.skippedRules || [],
      violations: (__r.violations || []).map(function (v) {
        return {
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
          source: v.source,
        };
      }),
    });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String((err && err.message) || err) });
  }
})()`;
}

interface InPageOk {
  ok: true;
  url: string;
  timestamp: number;
  ruleCount: number;
  skippedRules: { ruleId: string; error: string }[];
  violations: Violation[];
}
interface InPageErr {
  ok: false;
  error: string;
}

function summarizeException(detail: { text?: string; exception?: { description?: string } }): string {
  if (detail.exception?.description) return detail.exception.description.split("\n")[0]!;
  return detail.text ?? "Unknown in-page exception";
}

async function waitForLoadEvent(client: CDP.Client, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${timeoutMs}ms waiting for page load`)),
      timeoutMs,
    );
  });
  try {
    await Promise.race([client.Page.loadEventFired().then(() => undefined), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function waitForExpression(client: CDP.Client, waitFor: string, timeoutMs: number): Promise<void> {
  // Treat waitFor as a selector. If it doesn't look like a selector (contains
  // spaces and non-CSS chars), treat it as visible text.
  const looksLikeSelector = /^[#.\[\]:>~+*\-_a-zA-Z0-9 ]+$/.test(waitFor) && !/\s\s/.test(waitFor);
  const probe = looksLikeSelector
    ? `Boolean(document.querySelector(${JSON.stringify(waitFor)}))`
    : `document.body && document.body.innerText && document.body.innerText.includes(${JSON.stringify(waitFor)})`;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await client.Runtime.evaluate({
      expression: probe,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`waitFor probe failed: ${summarizeException(res.exceptionDetails)}`);
    }
    if (res.result.value === true) return;
    await new Promise((r) => setTimeout(r, WAIT_POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for "${waitFor}"`);
}

// Reuse a single auto-launched Chrome instance for the lifetime of the MCP process.
let managedChrome: chromeLauncher.LaunchedChrome | null = null;

async function autoLaunchChrome(): Promise<Endpoint | { error: string }> {
  if (managedChrome) {
    try {
      await CDP.List({ host: "127.0.0.1", port: managedChrome.port });
      return { host: "127.0.0.1", port: managedChrome.port };
    } catch {
      managedChrome = null;
    }
  }
  try {
    managedChrome = await chromeLauncher.launch({
      startingUrl: "about:blank",
      chromeFlags: ["--start-minimized"],
    });
    process.once("exit", () => {
      try { managedChrome?.kill(); } catch { /* best-effort */ }
    });
    return { host: "127.0.0.1", port: managedChrome.port };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runLiveAudit(opts: RunLiveAuditOptions): Promise<RunLiveAuditOutcome> {
  let endpoint: Endpoint;
  try {
    endpoint = parseEndpoint(opts.cdpEndpoint);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Probe HTTP discovery first so we can return a clean error message if
  // Chrome isn't reachable, instead of a low-level WS connection failure.
  let targets: TargetInfo[];
  try {
    targets = await listTargets(endpoint);
  } catch {
    // CDP not reachable — auto-launch Chrome minimized and retry.
    const launched = await autoLaunchChrome();
    if ("error" in launched) {
      return {
        ok: false,
        error:
          `Could not connect to Chrome at ${endpoint.host}:${endpoint.port} and auto-launch failed: ${launched.error}. ` +
          `Install chrome-devtools-mcp as a fallback (claude mcp add chrome-devtools npx -- -y chrome-devtools-mcp@latest).`,
      };
    }
    endpoint = launched;
    try {
      targets = await listTargets(endpoint);
    } catch (err2) {
      return {
        ok: false,
        error: `Chrome launched but CDP still unreachable: ${err2 instanceof Error ? err2.message : String(err2)}`,
      };
    }
  }

  let target = findPageTarget(targets, opts.url);
  let createdTargetId: string | undefined;

  if (!target) {
    if (opts.attachExisting) {
      const pageList = targets
        .filter((t) => t.type === "page")
        .map((t) => `  - ${t.url}`)
        .join("\n");
      return {
        ok: false,
        error:
          `attach_existing=true but no open tab matches "${opts.url}". Open it first.\n\n` +
          (pageList ? `Currently open pages:\n${pageList}` : "No page targets are open."),
      };
    }
    try {
      const created = (await CDP.New({
        host: endpoint.host,
        port: endpoint.port,
        url: opts.url,
      })) as TargetInfo;
      target = created;
      createdTargetId = created.id;
    } catch (err) {
      return {
        ok: false,
        error: `Failed to create new tab for "${opts.url}": ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  let client: CDP.Client | undefined;
  try {
    client = await CDP({ host: endpoint.host, port: endpoint.port, target: target.id });
    await client.Page.enable();
    await client.Runtime.enable();

    // If we created the tab, Page.loadEventFired may have fired already. Race
    // against a readyState probe so we don't hang.
    if (createdTargetId) {
      const ready = await client.Runtime.evaluate({
        expression: `document.readyState === "complete"`,
        returnByValue: true,
      });
      if (ready.result.value !== true) {
        await waitForLoadEvent(client, NAVIGATION_TIMEOUT_MS);
      }
    }

    if (opts.waitFor) {
      await waitForExpression(client, opts.waitFor, opts.waitTimeoutMs ?? WAIT_FOR_DEFAULT_MS);
    }

    const { bytes } = loadCoreIIFE();
    const expression = buildAuditExpression({
      iifeBytes: bytes,
      coreOptions: opts.coreOptions,
      sourceMap: opts.sourceMap ?? "fiber",
    });

    const evalResult = await client.Runtime.evaluate({
      expression,
      awaitPromise: true,
      returnByValue: true,
      // The IIFE is large; bumping the timeout above the default keeps slow
      // pages from spuriously failing the audit.
      timeout: 30_000,
    });

    if (evalResult.exceptionDetails) {
      return {
        ok: false,
        error: `In-page audit failed: ${summarizeException(evalResult.exceptionDetails)}`,
      };
    }

    const raw = evalResult.result.value;
    if (typeof raw !== "string") {
      return { ok: false, error: `Expected JSON string from in-page audit, got ${typeof raw}` };
    }

    let parsed: InPageOk | InPageErr;
    try {
      parsed = JSON.parse(raw) as InPageOk | InPageErr;
    } catch (err) {
      return {
        ok: false,
        error: `Could not parse in-page audit result: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (!parsed.ok) {
      return { ok: false, error: `In-page audit threw: ${parsed.error}` };
    }

    const result: AuditResult = {
      url: parsed.url,
      timestamp: parsed.timestamp,
      ruleCount: parsed.ruleCount,
      skippedRules: parsed.skippedRules,
      violations: parsed.violations,
    };
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: `CDP error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    try {
      await client?.close();
    } catch {
      // best-effort
    }
    if (createdTargetId) {
      try {
        await CDP.Close({ host: endpoint.host, port: endpoint.port, id: createdTargetId });
      } catch {
        // best-effort; closing a tab we opened is hygiene, not correctness
      }
    }
  }
}
