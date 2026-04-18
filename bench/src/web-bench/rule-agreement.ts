#!/usr/bin/env tsx
/**
 * Compute per-rule agreement between @accesslint/core and axe-core.
 *
 * For each @accesslint/core rule that fired in the results, computes:
 *   - agreement: (pages where both tools agree on the criterion) / total pages
 *   - precision: of pages where this rule fires, what % does axe also flag?
 *   - accesslintOnly: pages where this rule fires but axe doesn't find the criterion
 *
 * Flags rules for disabling when precision < threshold AND axe actually
 * covers the criterion (i.e., @accesslint/core is catching different/extra issues vs axe).
 *
 * Usage:
 *   npx tsx src/web-bench/rule-agreement.ts [results-file] [--threshold=0.80]
 */
import { readFileSync } from "node:fs";
import type { SiteResult } from "./types.js";

const file = process.argv.find((a) => !a.startsWith("--") && a.endsWith(".jsonl"))
  ?? "results/web-bench.jsonl";
const thresholdArg = process.argv.find((a) => a.startsWith("--threshold="));
const threshold = thresholdArg ? parseFloat(thresholdArg.split("=")[1]) : 0.80;

const lines = readFileSync(file, "utf-8").split("\n").filter(Boolean);
const results: SiteResult[] = lines.map((l) => JSON.parse(l));
const ok = results.filter((r) => r.status === "ok");
const totalPages = ok.length;

if (totalPages === 0) {
  console.error("No successful results found.");
  process.exit(1);
}

console.log(`\nLoaded ${results.length} results (${totalPages} OK)\n`);

// Track which WCAG criteria axe covers at all (found on any page)
const axeCoveredCriteria = new Set<string>();
for (const r of ok) {
  for (const c of r.axeWcagCriteria) axeCoveredCriteria.add(c);
}

// For each @accesslint/core rule, track per-page firing and axe agreement
interface RuleStats {
  ruleId: string;
  wcagCriteria: Set<string>;
  pagesFired: number;
  pagesAxeAgrees: number;
  pagesNeitherFound: number;
}

const ruleStats = new Map<string, RuleStats>();

for (const r of ok) {
  const alRuleCriteria = new Map<string, string[]>();

  for (const detail of r.criteriaDetail) {
    for (const ruleId of detail.alRuleIds) {
      if (!alRuleCriteria.has(ruleId)) alRuleCriteria.set(ruleId, []);
      alRuleCriteria.get(ruleId)!.push(detail.criterion);
    }
  }

  for (const [ruleId, criteria] of alRuleCriteria) {
    if (!ruleStats.has(ruleId)) {
      ruleStats.set(ruleId, {
        ruleId,
        wcagCriteria: new Set(),
        pagesFired: 0,
        pagesAxeAgrees: 0,
        pagesNeitherFound: 0,
      });
    }
    const stats = ruleStats.get(ruleId)!;
    stats.pagesFired++;

    const axeAgreed = criteria.some((c) => {
      stats.wcagCriteria.add(c);
      return r.axeWcagCriteria.includes(c);
    });
    if (axeAgreed) stats.pagesAxeAgrees++;
  }

  for (const stats of ruleStats.values()) {
    if (!alRuleCriteria.has(stats.ruleId)) {
      const axeFoundAny = [...stats.wcagCriteria].some((c) =>
        r.axeWcagCriteria.includes(c),
      );
      if (!axeFoundAny) stats.pagesNeitherFound++;
    }
  }
}

// Compute metrics and sort
interface RuleReport {
  ruleId: string;
  wcag: string;
  pagesFired: number;
  alOnly: number;
  agreement: number;
  precision: number;
  axeCovers: boolean; // whether axe covers any of this rule's WCAG criteria
}

const reports: RuleReport[] = [];

for (const stats of ruleStats.values()) {
  const agreement =
    (stats.pagesAxeAgrees + stats.pagesNeitherFound) / totalPages;
  const precision =
    stats.pagesFired > 0 ? stats.pagesAxeAgrees / stats.pagesFired : 0;
  const alOnly = stats.pagesFired - stats.pagesAxeAgrees;
  const axeCovers = [...stats.wcagCriteria].some((c) => axeCoveredCriteria.has(c));

  reports.push({
    ruleId: stats.ruleId,
    wcag: [...stats.wcagCriteria].sort().join(", "),
    pagesFired: stats.pagesFired,
    alOnly,
    agreement,
    precision,
    axeCovers,
  });
}

reports.sort((a, b) => a.precision - b.precision);

// Print table
console.log(
  `${"Rule".padEnd(35)} ${"WCAG".padEnd(14)} ${"Fired".padStart(6)} ${"ALonly".padStart(7)} ${"Agree".padStart(7)} ${"Prec".padStart(7)}  Status`,
);
console.log("-".repeat(95));

const belowThreshold: string[] = [];

for (const r of reports) {
  let status = "";
  if (r.precision < threshold && r.axeCovers) {
    status = "DISABLE";
    belowThreshold.push(r.ruleId);
  } else if (r.precision < threshold && !r.axeCovers) {
    status = "(axe n/a)";
  }
  console.log(
    `${r.ruleId.padEnd(35)} ${r.wcag.padEnd(14)} ${String(r.pagesFired).padStart(6)} ${String(r.alOnly).padStart(7)} ${r.agreement.toFixed(2).padStart(7)} ${r.precision.toFixed(2).padStart(7)}  ${status}`,
  );
}

console.log("-".repeat(95));
console.log(`\nTotal rules that fired: ${reports.length}`);
console.log(`Rules below ${(threshold * 100).toFixed(0)}% precision (axe-covered): ${belowThreshold.length}`);

if (belowThreshold.length > 0) {
  console.log(`\nRules to disable:\n  ${belowThreshold.join("\n  ")}`);
  console.log(`\nFor src/rules/index.ts:\n`);
  console.log(`export const defaultDisabledRuleIds = new Set([`);
  for (const id of belowThreshold.sort()) {
    console.log(`  "${id}",`);
  }
  console.log(`]);`);
}

console.log();
