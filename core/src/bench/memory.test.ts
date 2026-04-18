import { describe, it, expect } from "vitest";
import { runAudit } from "../rules/index";
import { generateDoc, SMALL_SIZE } from "./fixtures";

function forceGC(): void {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

/**
 * What this catches vs what it doesn't:
 *
 * Catches:  a rule or utility retaining Element/Document references
 *           across audits — e.g. a module-level Map<Element, *> whose
 *           WeakMap was replaced with a Map, or a cache that holds
 *           violation objects keyed on the doc.
 *
 * Doesn't catch: transient-document leaks where happy-dom retains its
 *           own internal doc state until Window disposal. A fresh-doc
 *           variant (generate+drop 50 docs) is dominated by happy-dom's
 *           residency (>1 GB in practice) and doesn't isolate our
 *           caches, so we stick to the single-document shape.
 *
 * Budget discussion: observed growth over 10 post-warmup audits is
 * ~14 MB on this machine under V8 GC scheduling. That's largely vitest
 * worker heap churn, not a real leak — reducing the budget below that
 * produces false positives. The assertion's job is to catch
 * catastrophic leaks (orders of magnitude off); smaller regressions
 * need heap-snapshot tooling that happy-dom can't supply.
 */
describe("memory", () => {
  it("does not leak across repeated audits on the same document", () => {
    const doc = generateDoc(SMALL_SIZE);

    // 10 warmup audits (vs the prior 5) let V8 stabilise before we
    // take a baseline, so transient opt/deopt churn doesn't inflate
    // the measured growth.
    for (let i = 0; i < 10; i++) runAudit(doc);
    forceGC();
    const baseline = process.memoryUsage().heapUsed;

    // 10 more audits against the same doc. 16 MB budget remains the
    // catastrophic-leak tripwire; a 1 MB/audit linear leak would
    // cross it.
    for (let i = 0; i < 10; i++) runAudit(doc);
    forceGC();
    const after = process.memoryUsage().heapUsed;

    const growth = after - baseline;
    expect(growth).toBeLessThan(16 * 1024 * 1024); // 16 MB
  }, 300_000);
});
