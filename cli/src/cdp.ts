import CDP from "chrome-remote-interface";
import type { AuditResult, Violation } from "@accesslint/core";
import type { SnapshotViolation } from "@accesslint/matchers-internal/snapshot";
import { loadCoreIIFE } from "./iife-source.js";
import {
  buildAuditExpression,
  mapInPageToSnapshot,
  type InPageOk,
  type InPageErr,
} from "./cdp-audit.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9222;
const NAVIGATION_TIMEOUT_MS = 15_000;
const WAIT_FOR_DEFAULT_MS = 10_000;
const WAIT_POLL_INTERVAL_MS = 100;

export interface RunLiveAuditOptions {
  url: string;
  host?: string;
  port?: number;
  attachExisting?: boolean;
  waitFor?: string;
  waitTimeoutMs?: number;
  selector?: string;
  coreOptions: {
    disabledRules?: string[];
    includeAAA?: boolean;
    componentMode?: boolean;
  };
}

export type RunLiveAuditOutcome =
  | { ok: true; result: AuditResult; snapshotViolations: SnapshotViolation[] }
  | { ok: false; error: string };

interface TargetInfo {
  id: string;
  type: string;
  url: string;
}

async function listTargets(host: string, port: number): Promise<TargetInfo[]> {
  return (await CDP.List({ host, port })) as TargetInfo[];
}

function findPageTarget(targets: TargetInfo[], url: string): TargetInfo | undefined {
  const exact = targets.find((t) => t.type === "page" && t.url === url);
  if (exact) return exact;
  return targets.find((t) => t.type === "page" && t.url.startsWith(url));
}

function summarizeException(detail: { text?: string; exception?: { description?: string } }): string {
  if (detail.exception?.description) return detail.exception.description.split("\n")[0]!;
  return detail.text ?? "Unknown in-page exception";
}

async function waitForLoadEvent(client: CDP.Client, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms waiting for page load`)), timeoutMs);
  });
  try {
    await Promise.race([client.Page.loadEventFired().then(() => undefined), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function waitForSelector(client: CDP.Client, selector: string, timeoutMs: number): Promise<void> {
  const probe = `Boolean(document.querySelector(${JSON.stringify(selector)}))`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await client.Runtime.evaluate({ expression: probe, returnByValue: true });
    if (res.exceptionDetails) throw new Error(`selector probe failed: ${summarizeException(res.exceptionDetails)}`);
    if (res.result.value === true) return;
    await new Promise((r) => setTimeout(r, WAIT_POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for selector "${selector}"`);
}

async function waitForExpression(client: CDP.Client, waitFor: string, timeoutMs: number): Promise<void> {
  const looksLikeSelector = /^[#.\[\]:>~+*\-_a-zA-Z0-9 ]+$/.test(waitFor) && !/\s\s/.test(waitFor);
  const probe = looksLikeSelector
    ? `Boolean(document.querySelector(${JSON.stringify(waitFor)}))`
    : `document.body && document.body.innerText && document.body.innerText.includes(${JSON.stringify(waitFor)})`;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await client.Runtime.evaluate({ expression: probe, returnByValue: true });
    if (res.exceptionDetails) throw new Error(`waitFor probe failed: ${summarizeException(res.exceptionDetails)}`);
    if (res.result.value === true) return;
    await new Promise((r) => setTimeout(r, WAIT_POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for "${waitFor}"`);
}

export async function runLiveAudit(opts: RunLiveAuditOptions): Promise<RunLiveAuditOutcome> {
  const host = opts.host ?? DEFAULT_HOST;
  const port = opts.port ?? DEFAULT_PORT;

  let targets: TargetInfo[];
  try {
    targets = await listTargets(host, port);
  } catch {
    return {
      ok: false,
      error:
        `No Chrome debug session found at ${host}:${port}.\n` +
        `  npx @accesslint/chrome ensure --port ${port}`,
    };
  }

  let target = findPageTarget(targets, opts.url);
  let createdTargetId: string | undefined;

  if (!target) {
    if (opts.attachExisting) {
      const pageList = targets.filter((t) => t.type === "page").map((t) => `  - ${t.url}`).join("\n");
      return {
        ok: false,
        error:
          `--attach set but no open tab matches "${opts.url}". Open it first.\n\n` +
          (pageList ? `Currently open pages:\n${pageList}` : "No page targets are open."),
      };
    }
    try {
      const created = (await CDP.New({ host, port })) as TargetInfo;
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
    client = await CDP({ host, port, target: target.id });
    await client.Page.enable();
    await client.Runtime.enable();

    if (createdTargetId) {
      await client.Page.navigate({ url: opts.url });
      await waitForLoadEvent(client, NAVIGATION_TIMEOUT_MS);
    }

    if (opts.waitFor) {
      await waitForExpression(client, opts.waitFor, opts.waitTimeoutMs ?? WAIT_FOR_DEFAULT_MS);
    }

    if (opts.selector) {
      await waitForSelector(client, opts.selector, opts.waitTimeoutMs ?? WAIT_FOR_DEFAULT_MS);
    }

    const { bytes } = loadCoreIIFE();
    const expression = buildAuditExpression(bytes, opts.coreOptions, opts.selector);

    const evalResult = await client.Runtime.evaluate({
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: 30_000,
    });

    if (evalResult.exceptionDetails) {
      return { ok: false, error: `In-page audit failed: ${summarizeException(evalResult.exceptionDetails)}` };
    }

    const raw = evalResult.result.value;
    if (typeof raw !== "string") {
      return { ok: false, error: `Expected JSON string from in-page audit, got ${typeof raw}` };
    }

    let parsed: InPageOk | InPageErr;
    try {
      parsed = JSON.parse(raw) as InPageOk | InPageErr;
    } catch (err) {
      return { ok: false, error: `Could not parse in-page audit result: ${err instanceof Error ? err.message : String(err)}` };
    }

    if (!parsed.ok) {
      return { ok: false, error: `In-page audit threw: ${parsed.error}` };
    }

    const snapshotViolations: SnapshotViolation[] = mapInPageToSnapshot(parsed.violations);

    return {
      ok: true,
      result: {
        url: parsed.url,
        timestamp: parsed.timestamp,
        ruleCount: parsed.ruleCount,
        skippedRules: parsed.skippedRules,
        violations: parsed.violations as unknown as Violation[],
      },
      snapshotViolations,
    };
  } catch (err) {
    return { ok: false, error: `CDP error: ${err instanceof Error ? err.message : String(err)}` };
  } finally {
    try { await client?.close(); } catch { /* best-effort */ }
    if (createdTargetId) {
      try { await CDP.Close({ host, port, id: createdTargetId }); } catch { /* best-effort */ }
    }
  }
}
