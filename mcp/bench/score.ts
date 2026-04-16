import { readFileSync } from "node:fs";
import { matchClaudeViolations } from "./lib/matching.js";
import type {
  BenchmarkResults,
  CaseScore,
  ClaudeViolation,
  ExpectedViolation,
} from "./lib/types.js";

const resultsPath = process.argv[2];
if (!resultsPath) {
  console.error("Usage: npx tsx bench/score.ts <results-file.json>");
  process.exit(1);
}

const results: BenchmarkResults = JSON.parse(
  readFileSync(resultsPath, "utf-8")
);

function computePRF(tp: number, fp: number, fn: number) {
  // When there are no expected violations and none were found, that's a perfect score
  if (tp === 0 && fp === 0 && fn === 0) return { precision: 1, recall: 1, f1: 1 };
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / arr.length);
}

function mcpExactMatch(
  actual: Array<{ ruleId: string; selector: string; impact: string }>,
  expected: ExpectedViolation[]
): { tp: number; fp: number; fn: number } {
  const remaining = [...actual];
  let tp = 0;
  let fn = 0;

  for (const ev of expected) {
    const idx = remaining.findIndex(
      (a) =>
        a.ruleId === ev.ruleId &&
        a.selector.includes(ev.selectorPattern) &&
        a.impact === ev.impact
    );
    if (idx !== -1) {
      tp++;
      remaining.splice(idx, 1);
    } else {
      fn++;
    }
  }

  return { tp, fp: remaining.length, fn };
}

// Score each case
const scores: CaseScore[] = [];

for (const [caseId, caseData] of Object.entries(results.cases)) {
  const expected = caseData.expectedViolations;

  // MCP scoring (exact match, same as validate.ts)
  const mcpRun = caseData.mcp[0];
  const mcpMetrics = mcpRun
    ? mcpExactMatch(mcpRun.raw, expected)
    : { tp: 0, fp: 0, fn: expected.length };
  const mcpPRF = computePRF(mcpMetrics.tp, mcpMetrics.fp, mcpMetrics.fn);

  // Claude scoring (fuzzy match per run)
  const claudeRunScores: CaseScore["claude"]["runs"] = [];

  for (const run of caseData.claude) {
    if (run.error) {
      claudeRunScores.push({
        tp: 0,
        fp: 0,
        fn: expected.length,
        precision: 0,
        recall: 0,
        f1: 0,
        durationMs: run.durationMs,
      });
      continue;
    }

    // Reconstruct ClaudeViolation from raw data
    const claudeViolations: ClaudeViolation[] = run.raw.map((r) => ({
      element: r.selector,
      issue: r.issue ?? "",
      wcagCriterion: r.wcagCriterion ?? "",
      impact: r.impact as ClaudeViolation["impact"],
    }));

    const matchResult = matchClaudeViolations(claudeViolations, expected);
    const prf = computePRF(matchResult.tp, matchResult.fp, matchResult.fn);

    claudeRunScores.push({
      ...matchResult,
      ...prf,
      durationMs: run.durationMs,
    });
  }

  const claudeMean = {
    precision: mean(claudeRunScores.map((r) => r.precision)),
    recall: mean(claudeRunScores.map((r) => r.recall)),
    f1: mean(claudeRunScores.map((r) => r.f1)),
    durationMs: mean(claudeRunScores.map((r) => r.durationMs)),
  };

  const claudeStddev = {
    precision: stddev(claudeRunScores.map((r) => r.precision)),
    recall: stddev(claudeRunScores.map((r) => r.recall)),
    f1: stddev(claudeRunScores.map((r) => r.f1)),
  };

  scores.push({
    caseId,
    difficulty: caseData.difficulty,
    expectedCount: expected.length,
    mcp: {
      ...mcpMetrics,
      ...mcpPRF,
      durationMs: mcpRun?.durationMs ?? 0,
    },
    claude: {
      runs: claudeRunScores,
      mean: claudeMean,
      stddev: claudeStddev,
    },
  });
}

// Aggregate
const hasClaude = scores.some((s) => s.claude.runs.length > 0);

function pct(v: number): string {
  return (v * 100).toFixed(1) + "%";
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

function padL(s: string, n: number): string {
  return s.padStart(n);
}

// Aggregate metrics
const aggMcpP = mean(scores.map((s) => s.mcp.precision));
const aggMcpR = mean(scores.map((s) => s.mcp.recall));
const aggMcpF1 = mean(scores.map((s) => s.mcp.f1));
const aggMcpMs = mean(scores.map((s) => s.mcp.durationMs));

const aggClaudeP = mean(scores.map((s) => s.claude.mean.precision));
const aggClaudeR = mean(scores.map((s) => s.claude.mean.recall));
const aggClaudeF1 = mean(scores.map((s) => s.claude.mean.f1));
const aggClaudeMs = mean(scores.map((s) => s.claude.mean.durationMs));

const aggClaudePStd = stddev(scores.filter((s) => s.claude.runs.length > 0).map((s) => s.claude.mean.precision));
const aggClaudeRStd = stddev(scores.filter((s) => s.claude.runs.length > 0).map((s) => s.claude.mean.recall));
const aggClaudeF1Std = stddev(scores.filter((s) => s.claude.runs.length > 0).map((s) => s.claude.mean.f1));

// Aggregate token usage across all Claude runs
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCacheReadTokens = 0;
let totalCacheCreationTokens = 0;
let totalCostUsd = 0;
let claudeRunCount = 0;

for (const caseData of Object.values(results.cases)) {
  for (const run of caseData.claude) {
    if (run.tokens) {
      totalInputTokens += run.tokens.inputTokens;
      totalOutputTokens += run.tokens.outputTokens;
      totalCacheReadTokens += run.tokens.cacheReadInputTokens;
      totalCacheCreationTokens += run.tokens.cacheCreationInputTokens;
      totalCostUsd += run.tokens.costUsd;
    }
    claudeRunCount++;
  }
}

console.log("=".repeat(70));
console.log("BENCHMARK RESULTS");
console.log(`  Config: ${results.config.runs} runs, model=${results.config.model}`);
console.log(`  Cases: ${results.manifest.caseCount}, Expected violations: ${results.manifest.totalExpectedViolations}`);
if (claudeRunCount > 0) {
  console.log(`  Claude runs: ${claudeRunCount}, Total cost: $${totalCostUsd.toFixed(4)}`);
  console.log(`  Tokens — input: ${totalInputTokens.toLocaleString()}, output: ${totalOutputTokens.toLocaleString()}, cache read: ${totalCacheReadTokens.toLocaleString()}, cache write: ${totalCacheCreationTokens.toLocaleString()}`);
  if (claudeRunCount > 0) {
    console.log(`  Per-call avg — input: ${Math.round(totalInputTokens / claudeRunCount).toLocaleString()}, output: ${Math.round(totalOutputTokens / claudeRunCount).toLocaleString()}, cost: $${(totalCostUsd / claudeRunCount).toFixed(4)}`);
  }
}
console.log("=".repeat(70));
console.log("");

// Aggregate table
console.log("AGGREGATE RESULTS");
console.log("  " + pad("Metric", 12) + "| " + pad("MCP", 14) + "| " + (hasClaude ? "Claude (mean +/- stddev)" : "Claude (not run)"));
console.log("  " + "-".repeat(12) + "|" + "-".repeat(15) + "|" + "-".repeat(30));
console.log(
  "  " + pad("Precision", 12) + "| " + pad(pct(aggMcpP), 14) + "| " +
  (hasClaude ? `${pct(aggClaudeP)} +/- ${pct(aggClaudePStd)}` : "—")
);
console.log(
  "  " + pad("Recall", 12) + "| " + pad(pct(aggMcpR), 14) + "| " +
  (hasClaude ? `${pct(aggClaudeR)} +/- ${pct(aggClaudeRStd)}` : "—")
);
console.log(
  "  " + pad("F1", 12) + "| " + pad(pct(aggMcpF1), 14) + "| " +
  (hasClaude ? `${pct(aggClaudeF1)} +/- ${pct(aggClaudeF1Std)}` : "—")
);
console.log(
  "  " + pad("Latency", 12) + "| " + pad(`${Math.round(aggMcpMs)}ms`, 14) + "| " +
  (hasClaude ? `${Math.round(aggClaudeMs)}ms` : "—")
);
console.log("");

// By difficulty
console.log("BY DIFFICULTY");
for (const diff of ["easy", "medium", "hard"] as const) {
  const subset = scores.filter((s) => s.difficulty === diff);
  if (subset.length === 0) continue;

  const dMcpF1 = mean(subset.map((s) => s.mcp.f1));
  const dClaudeF1 = mean(subset.map((s) => s.claude.mean.f1));
  const dClaudeF1Std = stddev(subset.filter((s) => s.claude.runs.length > 0).map((s) => s.claude.mean.f1));

  console.log(
    `  ${pad(diff, 8)} (${subset.length} cases) | MCP F1: ${pct(dMcpF1)} | ` +
    (hasClaude ? `Claude F1: ${pct(dClaudeF1)} +/- ${pct(dClaudeF1Std)}` : "Claude: —")
  );
}
console.log("");

// Per-case table
console.log("PER-CASE RESULTS");
console.log(
  "  " + pad("Case", 30) + "| " + pad("Exp", 4) + "| " +
  pad("MCP P/R/F1", 18) + "| " +
  (hasClaude ? pad("Claude P/R/F1 (mean)", 28) + "| " : "") +
  "Speed" + (hasClaude ? " | Tokens (in/out) Cost" : "")
);
console.log("  " + "-".repeat(hasClaude ? 120 : 65));

for (const s of scores) {
  const caseData = results.cases[s.caseId];
  const mcpPRF = `${pct(s.mcp.precision)}/${pct(s.mcp.recall)}/${pct(s.mcp.f1)}`;
  const claudePRF = hasClaude
    ? `${pct(s.claude.mean.precision)}/${pct(s.claude.mean.recall)}/${pct(s.claude.mean.f1)}`
    : "";
  const speed = hasClaude && s.claude.mean.durationMs > 0
    ? `${s.mcp.durationMs}ms vs ${Math.round(s.claude.mean.durationMs)}ms`
    : `${s.mcp.durationMs}ms`;

  // Per-case token stats
  let tokenInfo = "";
  if (hasClaude && caseData) {
    const runs = caseData.claude.filter((r) => r.tokens);
    if (runs.length > 0) {
      const avgIn = Math.round(mean(runs.map((r) => r.tokens!.inputTokens)));
      const avgOut = Math.round(mean(runs.map((r) => r.tokens!.outputTokens)));
      const avgCost = mean(runs.map((r) => r.tokens!.costUsd));
      tokenInfo = ` | ${avgIn}/${avgOut}tok $${avgCost.toFixed(4)}`;
    }
  }

  console.log(
    "  " + pad(s.caseId, 30) + "| " + padL(String(s.expectedCount), 3) + " | " +
    pad(mcpPRF, 18) + "| " +
    (hasClaude ? pad(claudePRF, 28) + "| " : "") +
    speed + tokenInfo
  );
}
console.log("");

// Consistency report (Claude cases with stddev F1 > 10%)
if (hasClaude) {
  const inconsistent = scores.filter(
    (s) => s.claude.runs.length > 1 && s.claude.stddev.f1 > 0.1
  );
  if (inconsistent.length > 0) {
    console.log("CONSISTENCY WARNINGS (Claude stddev F1 > 10%)");
    for (const s of inconsistent) {
      console.log(
        `  ${s.caseId}: F1 stddev = ${pct(s.claude.stddev.f1)} ` +
        `(runs: ${s.claude.runs.map((r) => pct(r.f1)).join(", ")})`
      );
    }
    console.log("");
  }
}

// Fix scoring
const fixCases = Object.entries(results.cases).filter(
  ([, c]) => c.expectedViolations.length > 0 && ((c.hybridFix && c.hybridFix.length > 0) || (c.claudeFix && c.claudeFix.length > 0))
);

if (fixCases.length > 0) {
  const hasHybridFix = fixCases.some(([, c]) => c.hybridFix && c.hybridFix.length > 0);
  const hasClaudeFix = fixCases.some(([, c]) => c.claudeFix && c.claudeFix.length > 0);

  interface CaseFixScore {
    caseId: string;
    difficulty: "easy" | "medium" | "hard";
    originalViolations: number;
    hybridFixRate: number;
    hybridRegrRate: number;
    hybridNetImprovement: number;
    claudeFixRates: number[];
    claudeRegrRates: number[];
    claudeNetImprovements: number[];
  }

  const fixScores: CaseFixScore[] = [];

  for (const [caseId, caseData] of fixCases) {
    const firstFix = (caseData.hybridFix?.[0]) ?? (caseData.claudeFix?.[0]);
    const origCount = firstFix?.originalViolationCount ?? 0;
    if (origCount === 0) continue;

    const hybridFixRates: number[] = [];
    const hybridRegrRates: number[] = [];
    const hybridNetImprovements: number[] = [];

    if (caseData.hybridFix) {
      for (const hf of caseData.hybridFix) {
        if (hf.error) continue;
        const fr = hf.fixedCount / origCount;
        const rr = hf.regressionCount / origCount;
        hybridFixRates.push(fr);
        hybridRegrRates.push(rr);
        hybridNetImprovements.push(fr - rr);
      }
    }

    const hybridFixRate = mean(hybridFixRates);
    const hybridRegrRate = mean(hybridRegrRates);
    const hybridNetImprovement = mean(hybridNetImprovements);

    const claudeFixRates: number[] = [];
    const claudeRegrRates: number[] = [];
    const claudeNetImprovements: number[] = [];

    if (caseData.claudeFix) {
      for (const cf of caseData.claudeFix) {
        if (cf.error) continue;
        const fr = cf.fixedCount / origCount;
        const rr = cf.regressionCount / origCount;
        claudeFixRates.push(fr);
        claudeRegrRates.push(rr);
        claudeNetImprovements.push(fr - rr);
      }
    }

    fixScores.push({
      caseId,
      difficulty: caseData.difficulty,
      originalViolations: origCount,
      hybridFixRate,
      hybridRegrRate,
      hybridNetImprovement,
      claudeFixRates,
      claudeRegrRates,
      claudeNetImprovements,
    });
  }

  if (fixScores.length > 0) {
    const aggHybridFixRate = mean(fixScores.map((s) => s.hybridFixRate));
    const aggHybridRegrRate = mean(fixScores.map((s) => s.hybridRegrRate));
    const aggHybridNetImpr = mean(fixScores.map((s) => s.hybridNetImprovement));

    const aggClaudeFixRate = mean(fixScores.map((s) => mean(s.claudeFixRates)));
    const aggClaudeRegrRate = mean(fixScores.map((s) => mean(s.claudeRegrRates)));
    const aggClaudeNetImpr = mean(fixScores.map((s) => mean(s.claudeNetImprovements)));

    const aggClaudeFixRateStd = stddev(fixScores.filter((s) => s.claudeFixRates.length > 0).map((s) => mean(s.claudeFixRates)));
    const aggClaudeRegrRateStd = stddev(fixScores.filter((s) => s.claudeRegrRates.length > 0).map((s) => mean(s.claudeRegrRates)));
    const aggClaudeNetImprStd = stddev(fixScores.filter((s) => s.claudeNetImprovements.length > 0).map((s) => mean(s.claudeNetImprovements)));

    console.log("FIX RESULTS");
    console.log("  " + pad("Metric", 18) + "| " + pad("MCP+Claude", 18) + "| " + (hasClaudeFix ? "Claude (mean +/- stddev)" : "Claude (not run)"));
    console.log("  " + "-".repeat(18) + "|" + "-".repeat(19) + "|" + "-".repeat(30));
    console.log(
      "  " + pad("Fix rate", 18) + "| " + pad(pct(aggHybridFixRate), 18) + "| " +
      (hasClaudeFix ? `${pct(aggClaudeFixRate)} +/- ${pct(aggClaudeFixRateStd)}` : "—")
    );
    console.log(
      "  " + pad("Regression rate", 18) + "| " + pad(pct(aggHybridRegrRate), 18) + "| " +
      (hasClaudeFix ? `${pct(aggClaudeRegrRate)} +/- ${pct(aggClaudeRegrRateStd)}` : "—")
    );
    console.log(
      "  " + pad("Net improvement", 18) + "| " + pad(pct(aggHybridNetImpr), 18) + "| " +
      (hasClaudeFix ? `${pct(aggClaudeNetImpr)} +/- ${pct(aggClaudeNetImprStd)}` : "—")
    );
    console.log("");

    console.log("PER-CASE FIX RESULTS");
    console.log(
      "  " + pad("Case", 30) + "| " + pad("Violations", 11) + "| " +
      pad("Hybrid fixed/regr", 18) + "| " +
      (hasClaudeFix ? "Claude fixed/regr (mean)" : "")
    );
    console.log("  " + "-".repeat(hasClaudeFix ? 95 : 65));

    for (const s of fixScores) {
      const hybridFixData = results.cases[s.caseId].hybridFix?.filter((hf) => !hf.error) ?? [];
      let hybridCol: string;
      if (hybridFixData.length > 0) {
        const avgFixed = mean(hybridFixData.map((hf) => hf.fixedCount));
        const avgRegr = mean(hybridFixData.map((hf) => hf.regressionCount));
        hybridCol = `${avgFixed.toFixed(1)}/${avgRegr.toFixed(1)}`;
      } else {
        hybridCol = "ERR";
      }

      let claudeCol = "";
      if (hasClaudeFix && s.claudeFixRates.length > 0) {
        const claudeFixData = results.cases[s.caseId].claudeFix?.filter((cf) => !cf.error) ?? [];
        const avgFixed = mean(claudeFixData.map((cf) => cf.fixedCount));
        const avgRegr = mean(claudeFixData.map((cf) => cf.regressionCount));
        claudeCol = `${avgFixed.toFixed(1)}/${avgRegr.toFixed(1)}`;
      } else if (hasClaudeFix) {
        claudeCol = "—";
      }

      console.log(
        "  " + pad(s.caseId, 30) + "| " + padL(String(s.originalViolations), 10) + " | " +
        pad(hybridCol, 18) + "| " +
        claudeCol
      );
    }
    console.log("");
  }
}

console.log("=".repeat(70));
