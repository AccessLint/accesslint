import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { SiteResult, CriterionConcordance, BenchOptions } from "./types.js";

export class JsonlWriter {
  private stream: ReturnType<typeof createWriteStream>;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.stream = createWriteStream(filePath, { flags: "w" });
  }

  write(result: SiteResult): void {
    this.stream.write(JSON.stringify(result) + "\n");
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.stream.end(resolve));
  }
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmtMs(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(0)}ms`;
}

/** Full performance stat set reported at both per-run and aggregate levels. */
export interface PerfStats {
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
}

export function buildPerfStats(times: number[]): PerfStats {
  return {
    mean: Math.round(mean(times)),
    median: Math.round(median(times)),
    p95: Math.round(percentile(times, 95)),
    min: Math.round(Math.min(...times)),
    max: Math.round(Math.max(...times)),
  };
}

/**
 * JSON-shaped summary. The aggregate script writes this to `summary.json`;
 * downstream HTML generators read it. Keys parallel the Performance table
 * printed by `printSummary` so anyone reading either representation gets
 * the same picture.
 */
export interface AggregateSummary {
  totalSites: number;
  okSites: number;
  errorSites: number;
  axeStats: PerfStats;
  alStats: PerfStats;
  axeViolationsTotal: number;
  alViolationsTotal: number;
  concordance: CriterionConcordance[];
  generatedAt: string;
}

export function buildAggregateSummary(
  results: SiteResult[],
  concordance: CriterionConcordance[],
): AggregateSummary {
  const ok = results.filter((r) => r.status === "ok");
  return {
    totalSites: results.length,
    okSites: ok.length,
    errorSites: results.length - ok.length,
    axeStats: buildPerfStats(ok.map((r) => r.axeTimeMs)),
    alStats: buildPerfStats(ok.map((r) => r.alTimeMs)),
    axeViolationsTotal: ok.reduce((s, r) => s + r.axeViolationCount, 0),
    alViolationsTotal: ok.reduce((s, r) => s + r.alViolationCount, 0),
    concordance,
    generatedAt: new Date().toISOString(),
  };
}

export function printSummary(
  results: SiteResult[],
  concordance: CriterionConcordance[],
  options: BenchOptions,
): void {
  const ok = results.filter((r) => r.status === "ok");
  const errors = results.filter((r) => r.status === "error");

  console.log("\n" + "=".repeat(70));
  console.log(`  Web Benchmark Summary`);
  console.log("=".repeat(70));

  console.log(`\n  Sites tested:    ${results.length}`);
  console.log(`    Successful:    ${ok.length}`);
  console.log(`    Errors:        ${errors.length}`);

  if (ok.length === 0) {
    console.log("\n  No successful audits to report.");
    return;
  }

  // DOM element counts (diagnostic for SPA/empty-page detection)
  const domCounts = ok.map((r) => r.domElementCount);
  const nearEmpty = ok.filter((r) => r.domElementCount < 10);
  console.log("\n  DOM Element Counts");
  console.log(`    Median:          ${median(domCounts).toLocaleString()}`);
  console.log(`    P95:             ${percentile(domCounts, 95).toLocaleString()}`);
  console.log(`    Max:             ${Math.max(...domCounts).toLocaleString()}`);
  console.log(`    Near-empty (<10): ${nearEmpty.length}`);

  // Audit-specific errors
  const axeErrors = ok.filter((r) => r.axeStatus === "error");
  const alErrors = ok.filter((r) => r.alStatus === "error");
  if (axeErrors.length > 0 || alErrors.length > 0) {
    console.log("\n  Audit Errors (on otherwise successful pages)");
    console.log(`    axe-core errors:   ${axeErrors.length}`);
    console.log(`    @accesslint errors: ${alErrors.length}`);
  }

  // Performance
  const axeTimes = ok.map((r) => r.axeTimeMs);
  const alTimes = ok.map((r) => r.alTimeMs);

  console.log("\n  Performance (ms)");
  console.log(`  ${"".padEnd(18)} ${"axe-core".padStart(10)}  ${"@accesslint".padStart(12)}`);
  console.log(
    `  ${"Mean".padEnd(18)} ${fmtMs(mean(axeTimes)).padStart(10)}  ${fmtMs(mean(alTimes)).padStart(12)}`,
  );
  console.log(
    `  ${"Median".padEnd(18)} ${fmtMs(median(axeTimes)).padStart(10)}  ${fmtMs(median(alTimes)).padStart(12)}`,
  );
  console.log(
    `  ${"P95".padEnd(18)} ${fmtMs(percentile(axeTimes, 95)).padStart(10)}  ${fmtMs(percentile(alTimes, 95)).padStart(12)}`,
  );
  console.log(
    `  ${"Min".padEnd(18)} ${fmtMs(Math.min(...axeTimes)).padStart(10)}  ${fmtMs(Math.min(...alTimes)).padStart(12)}`,
  );
  console.log(
    `  ${"Max".padEnd(18)} ${fmtMs(Math.max(...axeTimes)).padStart(10)}  ${fmtMs(Math.max(...alTimes)).padStart(12)}`,
  );

  // Violation counts
  const axeViolTotal = ok.reduce((s, r) => s + r.axeViolationCount, 0);
  const alViolTotal = ok.reduce((s, r) => s + r.alViolationCount, 0);
  console.log(`\n  Total violations found`);
  console.log(`    axe-core:        ${axeViolTotal.toLocaleString()}`);
  console.log(`    @accesslint:     ${alViolTotal.toLocaleString()}`);

  // Concordance
  if (concordance.length > 0) {
    console.log("\n  Concordance by WCAG Criterion");
    console.log(
      `  ${"Criterion".padEnd(12)} ${"Both".padStart(6)} ${"Axe".padStart(6)} ${"accesslint".padStart(10)} ${"None".padStart(6)} ${"n".padStart(6)} ${"Axe↔accesslint".padStart(14)} ${"PABAK".padStart(7)} ${"Depth".padStart(7)} ${"Jacc".padStart(6)} ${"95% CI".padStart(16)}`,
    );
    console.log(`  ${"-".repeat(90)}`);

    // Sort by most common criteria first (both + axeOnly + alOnly desc)
    const sorted = concordance
      .slice()
      .sort((a, b) => b.both + b.axeOnly + b.alOnly - (a.both + a.axeOnly + a.alOnly));

    for (const c of sorted) {
      const ci = `[${c.kappaCI[0].toFixed(2)},${c.kappaCI[1].toFixed(2)}]`;
      console.log(
        `  ${c.criterion.padEnd(12)} ${String(c.both).padStart(6)} ${String(c.axeOnly).padStart(6)} ${String(c.alOnly).padStart(10)} ${String(c.neither).padStart(6)} ${String(c.sampleSize).padStart(6)} ${c.axeAlKappa.toFixed(2).padStart(14)} ${c.pabak.toFixed(2).padStart(7)} ${c.medianDepthRatio.toFixed(2).padStart(7)} ${c.medianJaccard.toFixed(2).padStart(6)} ${ci.padStart(16)}`,
      );
    }

    const simpleMeanKappa = mean(concordance.map((c) => c.axeAlKappa));
    // Weighted mean: weight each criterion's kappa by detection count
    const totalWeight = concordance.reduce((s, c) => s + c.both + c.axeOnly + c.alOnly, 0);
    const weightedMeanKappa =
      totalWeight > 0
        ? concordance.reduce((s, c) => s + c.axeAlKappa * (c.both + c.axeOnly + c.alOnly), 0) /
          totalWeight
        : 0;

    console.log(`\n  Mean kappa (simple):   ${simpleMeanKappa.toFixed(2)}`);
    console.log(`  Mean kappa (weighted): ${weightedMeanKappa.toFixed(2)}`);
  }

  console.log(`\n  Results written to: ${options.outputFile}`);
  console.log("=".repeat(70) + "\n");
}
