import { describe, it, expect } from "vitest";
import { runAudit } from "../rules/index";
import { generateDoc, SMALL_SIZE } from "./fixtures";

function forceGC(): void {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

describe("memory", () => {
  it("does not leak across repeated audits on the same document", () => {
    const doc = generateDoc(SMALL_SIZE);

    // Warm up: populate caches, JIT-compile hot paths
    for (let i = 0; i < 5; i++) runAudit(doc);
    forceGC();
    const baseline = process.memoryUsage().heapUsed;

    // Second batch — should add near-zero retained memory
    for (let i = 0; i < 5; i++) runAudit(doc);
    forceGC();
    const after = process.memoryUsage().heapUsed;

    const growth = after - baseline;
    expect(growth).toBeLessThan(16 * 1024 * 1024); // 16 MB
  }, 300_000);
});
