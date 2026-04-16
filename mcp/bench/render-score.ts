import { readFileSync } from "node:fs";
import type { RenderBenchmarkResults } from "./lib/types.js";

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error("Usage: npx tsx bench/render-score.ts <results-file.json>");
  process.exit(1);
}

const results: RenderBenchmarkResults = JSON.parse(
  readFileSync(resultsPath, "utf-8")
);

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

function padL(s: string, n: number): string {
  return s.padStart(n);
}

// Per-case scoring
interface CaseRenderScore {
  caseId: string;
  difficulty: "easy" | "medium" | "hard";
  groundTruthCount: number;
  parityRates: number[];
  extraRates: number[];
  exactMatches: boolean[];
  durations: number[];
  meanParity: number;
  meanExtra: number;
  exactMatchRate: number;
  meanDuration: number;
}

const scores: CaseRenderScore[] = [];

// Token aggregation
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCacheReadTokens = 0;
let totalCacheCreationTokens = 0;
let totalCostUsd = 0;
let totalRuns = 0;

for (const [caseId, caseData] of Object.entries(results.cases)) {
  const gtCount = caseData.groundTruthViolations.length;
  const validRuns = caseData.runs.filter((r) => !r.error);

  const parityRates: number[] = [];
  const extraRates: number[] = [];
  const exactMatches: boolean[] = [];
  const durations: number[] = [];

  for (const run of validRuns) {
    const parity = gtCount > 0 ? run.matched / gtCount : (run.claudeViolations.length === 0 ? 1 : 0);
    const extra = gtCount > 0 ? run.extra / gtCount : run.extra;
    const exact = run.missing === 0 && run.extra === 0;

    parityRates.push(parity);
    extraRates.push(extra);
    exactMatches.push(exact);
    durations.push(run.durationMs);
  }

  for (const run of caseData.runs) {
    if (run.tokens) {
      totalInputTokens += run.tokens.inputTokens;
      totalOutputTokens += run.tokens.outputTokens;
      totalCacheReadTokens += run.tokens.cacheReadInputTokens;
      totalCacheCreationTokens += run.tokens.cacheCreationInputTokens;
      totalCostUsd += run.tokens.costUsd;
    }
    totalRuns++;
  }

  scores.push({
    caseId,
    difficulty: caseData.difficulty,
    groundTruthCount: gtCount,
    parityRates,
    extraRates,
    exactMatches,
    durations,
    meanParity: mean(parityRates),
    meanExtra: mean(extraRates),
    exactMatchRate: exactMatches.length > 0 ? exactMatches.filter(Boolean).length / exactMatches.length : 0,
    meanDuration: mean(durations),
  });
}

// Aggregate
const aggParity = mean(scores.map((s) => s.meanParity));
const aggExtra = mean(scores.map((s) => s.meanExtra));
const aggExactMatch = mean(scores.map((s) => s.exactMatchRate));
const aggDuration = mean(scores.map((s) => s.meanDuration));

const aggParityStd = stddev(scores.map((s) => s.meanParity));
const aggExtraStd = stddev(scores.map((s) => s.meanExtra));

console.log("=".repeat(70));
console.log("RENDER BENCHMARK RESULTS");
console.log(`  Config: ${results.config.runs} runs, model=${results.config.model}`);
console.log(`  Cases: ${results.manifest.caseCount}`);
if (totalRuns > 0) {
  console.log(`  Total runs: ${totalRuns}, Total cost: $${totalCostUsd.toFixed(4)}`);
  console.log(`  Tokens — input: ${totalInputTokens.toLocaleString()}, output: ${totalOutputTokens.toLocaleString()}, cache read: ${totalCacheReadTokens.toLocaleString()}, cache write: ${totalCacheCreationTokens.toLocaleString()}`);
  if (totalRuns > 0) {
    console.log(`  Per-call avg — input: ${Math.round(totalInputTokens / totalRuns).toLocaleString()}, output: ${Math.round(totalOutputTokens / totalRuns).toLocaleString()}, cost: $${(totalCostUsd / totalRuns).toFixed(4)}`);
  }
}
console.log("=".repeat(70));
console.log("");

// Aggregate table
console.log("AGGREGATE RESULTS");
console.log("  " + pad("Metric", 22) + "| Value");
console.log("  " + "-".repeat(22) + "|" + "-".repeat(30));
console.log("  " + pad("Violation Parity", 22) + "| " + `${pct(aggParity)} +/- ${pct(aggParityStd)}`);
console.log("  " + pad("Extra Rate", 22) + "| " + `${pct(aggExtra)} +/- ${pct(aggExtraStd)}`);
console.log("  " + pad("Exact Match Rate", 22) + "| " + pct(aggExactMatch));
console.log("  " + pad("Mean Latency", 22) + "| " + `${Math.round(aggDuration)}ms`);
console.log("");

// By difficulty
console.log("BY DIFFICULTY");
for (const diff of ["easy", "medium", "hard"] as const) {
  const subset = scores.filter((s) => s.difficulty === diff);
  if (subset.length === 0) continue;

  const dParity = mean(subset.map((s) => s.meanParity));
  const dExact = mean(subset.map((s) => s.exactMatchRate));
  const dParityStd = stddev(subset.map((s) => s.meanParity));

  console.log(
    `  ${pad(diff, 8)} (${subset.length} cases) | Parity: ${pct(dParity)} +/- ${pct(dParityStd)} | Exact: ${pct(dExact)}`
  );
}
console.log("");

// Per-case table
console.log("PER-CASE RESULTS");
console.log(
  "  " + pad("Case", 28) + "| " + pad("GT", 3) + "| " +
  pad("Parity", 10) + "| " +
  pad("Extra", 10) + "| " +
  pad("Exact", 8) + "| " +
  "Latency | Tokens (in/out) Cost"
);
console.log("  " + "-".repeat(100));

for (const s of scores) {
  const caseData = results.cases[s.caseId];

  // Per-case token stats
  let tokenInfo = "";
  const runsWithTokens = caseData.runs.filter((r) => r.tokens);
  if (runsWithTokens.length > 0) {
    const avgIn = Math.round(mean(runsWithTokens.map((r) => r.tokens!.inputTokens)));
    const avgOut = Math.round(mean(runsWithTokens.map((r) => r.tokens!.outputTokens)));
    const avgCost = mean(runsWithTokens.map((r) => r.tokens!.costUsd));
    tokenInfo = `${avgIn}/${avgOut}tok $${avgCost.toFixed(4)}`;
  }

  console.log(
    "  " + pad(s.caseId, 28) + "| " + padL(String(s.groundTruthCount), 2) + " | " +
    pad(pct(s.meanParity), 10) + "| " +
    pad(pct(s.meanExtra), 10) + "| " +
    pad(pct(s.exactMatchRate), 8) + "| " +
    pad(`${Math.round(s.meanDuration)}ms`, 8) + "| " +
    tokenInfo
  );
}
console.log("");

// Consistency report
const inconsistent = scores.filter(
  (s) => s.parityRates.length > 1 && stddev(s.parityRates) > 0.1
);
if (inconsistent.length > 0) {
  console.log("CONSISTENCY WARNINGS (parity stddev > 10%)");
  for (const s of inconsistent) {
    console.log(
      `  ${s.caseId}: parity stddev = ${pct(stddev(s.parityRates))} ` +
      `(runs: ${s.parityRates.map((r) => pct(r)).join(", ")})`
    );
  }
  console.log("");
}

// Error report
const errorCases = Object.entries(results.cases).filter(
  ([, c]) => c.runs.some((r) => r.error)
);
if (errorCases.length > 0) {
  console.log("ERRORS");
  for (const [caseId, caseData] of errorCases) {
    for (const run of caseData.runs) {
      if (run.error) {
        console.log(`  ${caseId} run ${run.runIndex}: ${run.error}`);
      }
    }
  }
  console.log("");
}

console.log("=".repeat(70));
