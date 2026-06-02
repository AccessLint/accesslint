import CDP from "chrome-remote-interface";
import type { AuditResult, Violation } from "@accesslint/core";
import { normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";
import type { SnapshotViolation } from "@accesslint/matchers-internal/snapshot";
import { loadCoreIIFE } from "./iife-source.js";

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

function buildAuditExpression(iifeBytes: string, coreOptions: RunLiveAuditOptions["coreOptions"], selector?: string): string {
  const optsJson = JSON.stringify(coreOptions);
  const selectorJson = selector ? JSON.stringify(selector) : "null";
  return `${iifeBytes}
;(async () => {
  try {
    const __r = window.AccessLint.runAudit(document, ${optsJson});
    if (typeof window.AccessLint.attachReactFiberSource === "function") {
      try { await window.AccessLint.attachReactFiberSource(__r.violations); } catch (_e) {}
    }
    const __selector = ${selectorJson};
    let __violations = __r.violations || [];
    if (__selector) {
      const __roots = Array.from(document.querySelectorAll(__selector));
      if (!__roots.length) throw new Error("Selector not found after wait: " + __selector);
      __violations = __violations.filter(function (v) {
        const el = document.querySelector(v.selector);
        return el && __roots.some(function (root) { return root === el || root.contains(el); });
      });
    }
    const AL = window.AccessLint;
    const _extractAnchor = typeof AL.extractAnchor === "function" ? AL.extractAnchor : null;
    const _getComputedRole = typeof AL.getComputedRole === "function" ? AL.getComputedRole : null;
    const _getAccessibleName = typeof AL.getAccessibleName === "function" ? AL.getAccessibleName : null;
    const _buildRelativeLocation = typeof AL.buildRelativeLocation === "function" ? AL.buildRelativeLocation : null;
    return JSON.stringify({
      ok: true,
      url: __r.url,
      timestamp: __r.timestamp,
      ruleCount: __r.ruleCount,
      skippedRules: __r.skippedRules || [],
      violations: __violations.map(function (v) {
        const el = v.element || null;
        const anchor = el && _extractAnchor ? _extractAnchor(el) : undefined;
        const roleBase = el && _getComputedRole ? _getComputedRole(el) : undefined;
        const roleName = el && _getAccessibleName ? _getAccessibleName(el).trim() : undefined;
        const role = roleBase ? (roleName ? roleBase + '[name="' + roleName + '"]' : roleBase) : undefined;
        const relativeLocation = el && _buildRelativeLocation ? _buildRelativeLocation(el) : undefined;
        const tag = el ? el.tagName.toLowerCase() : undefined;
        return {
          ruleId: v.ruleId, selector: v.selector, html: v.html, impact: v.impact,
          message: v.message, source: v.source,
          anchor: anchor || undefined,
          role: role || undefined,
          relativeLocation: relativeLocation || undefined,
          tag: tag || undefined,
        };
      }),
    });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String((err && err.message) || err) });
  }
})()`;
}

interface InPageViolation {
  ruleId: string;
  selector: string;
  html?: string;
  impact: Violation["impact"];
  message: string;
  source?: Violation["source"];
  anchor?: string;
  role?: string;
  relativeLocation?: string;
  tag?: string;
}

interface InPageOk {
  ok: true;
  url: string;
  timestamp: number;
  ruleCount: number;
  skippedRules: { ruleId: string; error: string }[];
  violations: InPageViolation[];
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
      const created = (await CDP.New({ host, port, url: opts.url })) as TargetInfo;
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
      const ready = await client.Runtime.evaluate({ expression: `document.readyState === "complete"`, returnByValue: true });
      if (ready.result.value !== true) {
        await waitForLoadEvent(client, NAVIGATION_TIMEOUT_MS);
      }
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

    const snapshotViolations: SnapshotViolation[] = parsed.violations.map((v) => {
      const sv: SnapshotViolation = { ruleId: v.ruleId, selector: v.selector };
      if (v.anchor) sv.anchor = v.anchor;
      if (v.role) sv.role = v.role;
      if (v.relativeLocation) sv.relativeLocation = v.relativeLocation;
      if (v.tag) sv.tag = v.tag;
      if (v.html) sv.htmlFingerprint = sha1Short(normalizeHtml(v.html));
      return sv;
    });

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
