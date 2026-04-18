/**
 * Aggregate a merged web-bench JSONL file into the full stats report.
 *
 * Reads the concatenated output of all shards (e.g. `results/web-bench.jsonl`),
 * recomputes concordance across the full sample, prints the same per-shard
 * summary table (mean / median / p95 / min / max plus per-WCAG-criterion
 * concordance), and writes a machine-readable `summary.json` with the
 * complete numbers.
 *
 * Usage:
 *   npx tsx src/aggregate.ts [--input results/web-bench.jsonl] [--output summary.json]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { calculateConcordance } from "./web-bench/concordance.js";
import { buildAggregateSummary, printSummary } from "./web-bench/reporter.js";
import type { BenchOptions, SiteResult } from "./web-bench/types.js";

function parseArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1];
}

const inputPath = parseArg("input") ?? "results/web-bench.jsonl";
const outputPath = parseArg("output") ?? "results/summary.json";

const raw = readFileSync(resolve(inputPath), "utf-8");
const results: SiteResult[] = raw
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

if (results.length === 0) {
  console.error(`No records found in ${inputPath}`);
  process.exit(1);
}

const concordance = calculateConcordance(results);

// The printSummary signature wants the options used to run the audit.
// When aggregating after-the-fact we only have the output file, so stub the
// rest. `printSummary` only reads `options.outputFile` for the closing line.
const options: BenchOptions = {
  sampleSize: results.length,
  concurrency: 0,
  timeout: 0,
  outputFile: inputPath,
};
printSummary(results, concordance, options);

const summary = buildAggregateSummary(results, concordance);
mkdirSync(dirname(resolve(outputPath)), { recursive: true });
writeFileSync(resolve(outputPath), JSON.stringify(summary, null, 2) + "\n");
console.log(`\n  Aggregate summary written to: ${outputPath}\n`);
