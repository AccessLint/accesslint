import type { SiteResult, CriterionConcordance } from "./types.js";

/**
 * Compute Cohen's kappa from a 2x2 contingency table.
 */
function cohenKappa(a: number, b: number, c: number, d: number): number {
  const n = a + b + c + d;
  if (n === 0) return 1;
  const po = (a + d) / n;
  const p1 = (a + b) / n;
  const p2 = (a + c) / n;
  const pe = p1 * p2 + (1 - p1) * (1 - p2);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

/**
 * Compute PABAK (prevalence-adjusted, bias-adjusted kappa).
 * More robust than Cohen's kappa for rare criteria.
 */
function pabak(a: number, _b: number, _c: number, d: number): number {
  const n = a + _b + _c + d;
  if (n === 0) return 1;
  const po = (a + d) / n;
  return 2 * po - 1;
}

/**
 * Bootstrap 95% confidence interval for Cohen's kappa.
 * Resamples with replacement, computes kappa per sample, returns [2.5th, 97.5th] percentiles.
 */
function bootstrapKappaCI(
  pages: { axeHas: boolean; alHas: boolean }[],
  iterations = 1000,
): [number, number] {
  const n = pages.length;
  if (n === 0) return [1, 1];

  const kappas: number[] = [];
  for (let i = 0; i < iterations; i++) {
    let a = 0, b = 0, c = 0, d = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(Math.random() * n);
      const p = pages[idx];
      if (p.axeHas && p.alHas) a++;
      else if (p.axeHas) b++;
      else if (p.alHas) c++;
      else d++;
    }
    kappas.push(cohenKappa(a, b, c, d));
  }

  kappas.sort((a, b) => a - b);
  const lo = kappas[Math.floor(iterations * 0.025)];
  const hi = kappas[Math.floor(iterations * 0.975)];
  return [lo, hi];
}

/**
 * Calculate per-criterion concordance across all successful site results.
 *
 * For each WCAG criterion, counts how the two tools (axe, @accesslint/core) agree,
 * then computes Cohen's kappa, PABAK, depth ratio, and Jaccard.
 * Pages where either tool errored are excluded from the kappa calculation.
 */
export function calculateConcordance(results: SiteResult[]): CriterionConcordance[] {
  const okResults = results.filter((r) => r.status === "ok");
  if (okResults.length === 0) return [];

  const allCriteria = new Set<string>();
  for (const r of okResults) {
    for (const c of r.axeWcagCriteria) allCriteria.add(c);
    for (const c of r.alWcagCriteria) allCriteria.add(c);
  }

  const concordances: CriterionConcordance[] = [];

  for (const criterion of [...allCriteria].sort()) {
    let both = 0;
    let axeOnly = 0;
    let alOnly = 0;
    let neither = 0;

    const depthRatios: number[] = [];
    const jaccards: number[] = [];
    const kappaPages: { axeHas: boolean; alHas: boolean }[] = [];

    for (const r of okResults) {
      // Exclude pages where either tool errored from kappa calculation
      if (r.axeStatus === "error" || r.alStatus === "error") continue;

      const axeHas = r.axeWcagCriteria.includes(criterion);
      const alHas = r.alWcagCriteria.includes(criterion);

      if (axeHas && alHas) both++;
      else if (axeHas) axeOnly++;
      else if (alHas) alOnly++;
      else neither++;

      kappaPages.push({ axeHas, alHas });

      // Detection depth ratio: when both flag criterion, compare node counts
      if (axeHas && alHas) {
        const detail = r.criteriaDetail.find((d) => d.criterion === criterion);
        if (detail && detail.axeNodeCount > 0 && detail.alNodeCount > 0) {
          depthRatios.push(
            Math.min(detail.axeNodeCount, detail.alNodeCount) /
              Math.max(detail.axeNodeCount, detail.alNodeCount),
          );
        }

        // Jaccard from element-level overlap
        if (detail && detail.elementUnion > 0) {
          jaccards.push(detail.elementIntersection / detail.elementUnion);
        }
      }
    }

    const sampleSize = both + axeOnly + alOnly + neither;
    const kappaCI = bootstrapKappaCI(kappaPages);

    concordances.push({
      criterion,
      both,
      axeOnly,
      alOnly,
      neither,
      axeAlKappa: cohenKappa(both, axeOnly, alOnly, neither),
      pabak: pabak(both, axeOnly, alOnly, neither),
      medianDepthRatio: medianOf(depthRatios),
      medianJaccard: medianOf(jaccards),
      sampleSize,
      kappaCI,
    });
  }

  return concordances;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
