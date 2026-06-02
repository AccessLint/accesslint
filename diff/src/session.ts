import CDP from "chrome-remote-interface";
import {
  buildAuditExpression,
  loadCoreIIFE,
  mapInPageToSnapshot,
  type CoreAuditExprOptions,
  type InPageErr,
  type InPageOk,
  type InPageViolation,
} from "@accesslint/cli/cdp-audit";
import type { SnapshotViolation } from "@accesslint/matchers-internal/snapshot";

const WAIT_POLL_INTERVAL_MS = 100;

export type RouteAudit =
  | { ok: true; snapshot: SnapshotViolation[]; full: InPageViolation[] }
  | { ok: false; error: string };

export interface RouteItem {
  route: string;
  url: string;
}

export interface AuditOriginOptions {
  host: string;
  port: number;
  items: RouteItem[];
  readySelector?: string;
  waitTimeoutMs: number;
  navigationTimeoutMs: number;
  concurrency: number;
  coreOptions: CoreAuditExprOptions;
  onRoute?: (done: number, total: number, route: string, ok: boolean) => void;
}

interface Tab {
  client: CDP.Client;
  targetId: string;
}

interface TargetInfo {
  id: string;
}

async function createTab(host: string, port: number): Promise<Tab> {
  const target = (await CDP.New({ host, port })) as TargetInfo;
  const client = await CDP({ host, port, target: target.id });
  await client.Page.enable();
  await client.Runtime.enable();
  return { client, targetId: target.id };
}

async function closeTab(host: string, port: number, tab: Tab): Promise<void> {
  try {
    await tab.client.close();
  } catch {
    /* best-effort */
  }
  try {
    await CDP.Close({ host, port, id: tab.targetId });
  } catch {
    /* best-effort */
  }
}

async function waitForLoad(client: CDP.Client, timeoutMs: number): Promise<void> {
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
    if (res.result.value === true) return;
    await new Promise((r) => setTimeout(r, WAIT_POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for selector "${selector}"`);
}

async function auditOne(
  tab: Tab,
  url: string,
  opts: AuditOriginOptions,
  iifeBytes: string,
): Promise<{ snapshot: SnapshotViolation[]; full: InPageViolation[] }> {
  await tab.client.Page.navigate({ url });
  await waitForLoad(tab.client, opts.navigationTimeoutMs);
  if (opts.readySelector) {
    await waitForSelector(tab.client, opts.readySelector, opts.waitTimeoutMs);
  }

  const expression = buildAuditExpression(iifeBytes, opts.coreOptions);
  const evalResult = await tab.client.Runtime.evaluate({
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout: 30_000,
  });
  if (evalResult.exceptionDetails) {
    throw new Error(evalResult.exceptionDetails.text ?? "in-page audit threw");
  }
  const raw = evalResult.result.value;
  if (typeof raw !== "string") {
    throw new Error(`expected JSON string from in-page audit, got ${typeof raw}`);
  }
  const parsed = JSON.parse(raw) as InPageOk | InPageErr;
  if (!parsed.ok) {
    throw new Error(`in-page audit threw: ${parsed.error}`);
  }
  return { snapshot: mapInPageToSnapshot(parsed.violations), full: parsed.violations };
}

/**
 * Audit every route against a single origin using a pool of reusable tabs.
 * The browser at host:port is warmed once per origin (HTTP + V8 cache shared
 * across tabs), then `concurrency` tabs drain the work queue in parallel.
 */
export async function auditRoutesOnOrigin(opts: AuditOriginOptions): Promise<Map<string, RouteAudit>> {
  const { bytes } = loadCoreIIFE();
  const results = new Map<string, RouteAudit>();
  const total = opts.items.length;
  const poolSize = Math.max(1, Math.min(opts.concurrency, total));

  const tabs: Tab[] = [];
  for (let i = 0; i < poolSize; i++) {
    tabs.push(await createTab(opts.host, opts.port));
  }

  let cursor = 0;
  let done = 0;
  const worker = async (tab: Tab): Promise<void> => {
    for (;;) {
      const index = cursor++;
      if (index >= total) break;
      const { route, url } = opts.items[index]!;
      try {
        const audited = await auditOne(tab, url, opts, bytes);
        results.set(route, { ok: true, snapshot: audited.snapshot, full: audited.full });
        opts.onRoute?.(++done, total, route, true);
      } catch (err) {
        results.set(route, { ok: false, error: err instanceof Error ? err.message : String(err) });
        opts.onRoute?.(++done, total, route, false);
      }
    }
  };

  try {
    await Promise.all(tabs.map((tab) => worker(tab)));
  } finally {
    await Promise.all(tabs.map((tab) => closeTab(opts.host, opts.port, tab)));
  }

  return results;
}
