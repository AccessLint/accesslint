import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { countByClass, diffCounts, formatTopDeltas, takeHeapSnapshot } from "./heap-diff";
import { generateHtml, SMALL_SIZE } from "./fixtures";

const IIFE_PATH = resolve(import.meta.dirname, "../../dist/index.iife.js");
const iifeExists = existsSync(IIFE_PATH);

test.skip(!iifeExists, "IIFE bundle not built (run turbo run build)");

/**
 * Per-class node-count budgets across a 50-document workload. Numbers
 * reflect realistic post-GC residency in Chromium: Chrome keeps a few
 * detached nodes around for a cycle or two before full collection, so
 * ≤ a handful per class is acceptable. Anything meaningfully larger
 * means our rule engine is retaining fixture DOM.
 */
const BUDGETS: Record<string, number> = {
  Document: 2,
  HTMLDocument: 2,
  HTMLDivElement: 10,
  HTMLIFrameElement: 2,
  HTMLButtonElement: 5,
  HTMLImageElement: 5,
};

test("no document/element leak across 50 transient audits", async ({ page }) => {
  const benchHtml = generateHtml(SMALL_SIZE);

  await page.setContent("<!doctype html><html><body></body></html>");
  // Stash the fixture HTML so we can read it from inside page.evaluate
  // without serialising 500 elements through the CDP boundary each call.
  await page.evaluate((html) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__BENCH_HTML__ = html;
  }, benchHtml);
  await page.addScriptTag({ path: IIFE_PATH });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");

  // Warm up — first audits populate caches and let V8 settle.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    for (let i = 0; i < 10; i++) {
      const iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
      iframe.contentDocument!.open();
      iframe.contentDocument!.write(w.__BENCH_HTML__);
      iframe.contentDocument!.close();
      w.AccessLint.runAudit(iframe.contentDocument);
      iframe.remove();
    }
    w.AccessLint.clearAllCaches();
  });

  await cdp.send("HeapProfiler.collectGarbage");
  const before = await takeHeapSnapshot(cdp);

  // Leak probe — 50 transient-iframe Documents, each audited and
  // dropped. Nothing should outlive the iteration.
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    for (let i = 0; i < 50; i++) {
      const iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
      iframe.contentDocument!.open();
      iframe.contentDocument!.write(w.__BENCH_HTML__);
      iframe.contentDocument!.close();
      w.AccessLint.runAudit(iframe.contentDocument);
      iframe.remove();
    }
    w.AccessLint.clearAllCaches();
  });

  await cdp.send("HeapProfiler.collectGarbage");
  const after = await takeHeapSnapshot(cdp);

  const delta = diffCounts(countByClass(before), countByClass(after));

  // Surface the top growers in test output so CI logs show what moved.
  // eslint-disable-next-line no-console
  console.log(`\n--- top heap deltas ---\n${formatTopDeltas(delta, 15)}\n`);

  for (const [className, budget] of Object.entries(BUDGETS)) {
    const grown = delta.get(className) ?? 0;
    expect(
      grown,
      `${className} grew by ${grown} nodes across 50 transient audits (budget ${budget})`,
    ).toBeLessThanOrEqual(budget);
  }
});
