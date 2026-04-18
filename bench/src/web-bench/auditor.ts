import { resolve } from "node:path";
import type { BrowserContext } from "playwright";
import type { BrowserAuditResult, SiteResult, CriterionPageResult } from "./types.js";
import { extractAxeWcagCriteria, deduplicateOverlapping } from "./wcag-mapping.js";

const AXE_PATH = resolve("node_modules/axe-core/axe.min.js");
const AL_PATH = resolve("node_modules/@accesslint/core/dist/index.iife.js");

/**
 * Browser-side audit code injected via page.evaluate (as a string to
 * avoid tsx __name transforms).
 *
 * Randomizes axe/@accesslint/core execution order per page. Collects per-criterion
 * element sets and computes intersection/union counts in-browser.
 */
function buildAuditCode(timeout: number): string {
  // Cap the in-page audit at 80% of the per-site timeout to leave room for navigation
  const auditTimeout = Math.round(timeout * 0.8);
  return `(async () => {
  var TIMEOUT = ${auditTimeout};

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error("audit timeout")); }, ms);
      })
    ]);
  }

  var domElementCount = document.querySelectorAll('*').length;

  var alRuleWcagMap = {};
  if (window.AccessLintCore && window.AccessLintCore.getActiveRules) {
    var rules = window.AccessLintCore.getActiveRules();
    for (var i = 0; i < rules.length; i++) {
      alRuleWcagMap[rules[i].id] = rules[i].wcag || [];
    }
  }

  // --- axe-core audit function ---
  function runAxe() {
    var axeTimeMs = 0;
    var axeViolationsRaw = [];
    var axeStatus = "ok";
    var axeError = null;
    return withTimeout(window.axe.run(document, { resultTypes: ["violations"] }), TIMEOUT)
      .then(function(axeResults) {
        axeTimeMs = performance.now() - axeStart;
        axeViolationsRaw = axeResults.violations;
        return { axeTimeMs: axeTimeMs, axeViolationsRaw: axeViolationsRaw, axeStatus: "ok", axeError: null };
      })
      .catch(function(e) {
        return { axeTimeMs: -1, axeViolationsRaw: [], axeStatus: "error", axeError: e instanceof Error ? e.message : String(e) };
      });
  }

  // --- @accesslint/core audit function ---
  function runAl() {
    var alTimeMs = 0;
    var alViolationsRaw = [];
    var alStatus = "ok";
    var alError = null;
    try {
      var alStart = performance.now();
      var alResultsRaw = window.AccessLintCore.runAudit(document);
      alTimeMs = performance.now() - alStart;
      alViolationsRaw = alResultsRaw.violations;
      return Promise.resolve({ alTimeMs: alTimeMs, alViolationsRaw: alViolationsRaw, alStatus: "ok", alError: null });
    } catch (e) {
      return Promise.resolve({ alTimeMs: -1, alViolationsRaw: [], alStatus: "error", alError: e instanceof Error ? e.message : String(e) });
    }
  }

  // Randomize execution order
  var axeFirst = Math.random() < 0.5;
  var axeStart, axeResult, alResult;

  if (axeFirst) {
    axeStart = performance.now();
    axeResult = await runAxe();
    alResult = await withTimeout(
      runAl(),
      TIMEOUT
    ).catch(function(e) {
      return { alTimeMs: -1, alViolationsRaw: [], alStatus: "error", alError: e instanceof Error ? e.message : String(e) };
    });
  } else {
    alResult = await withTimeout(
      runAl(),
      TIMEOUT
    ).catch(function(e) {
      return { alTimeMs: -1, alViolationsRaw: [], alStatus: "error", alError: e instanceof Error ? e.message : String(e) };
    });
    axeStart = performance.now();
    axeResult = await runAxe();
  }

  // --- Process axe violations: keep element references for overlap ---
  var axeViolations = [];
  var axeElementsByCriterion = {};
  var wcagRegex = /^wcag(\\d)(\\d)(\\d+)$/;

  for (var ai = 0; ai < axeResult.axeViolationsRaw.length; ai++) {
    var av = axeResult.axeViolationsRaw[ai];
    axeViolations.push({ id: av.id, tags: av.tags, nodeCount: av.nodes.length, impact: av.impact });

    // Parse WCAG criteria from tags
    var axeCriteria = [];
    for (var ti = 0; ti < av.tags.length; ti++) {
      var m = av.tags[ti].match(wcagRegex);
      if (m) axeCriteria.push(m[1] + "." + m[2] + "." + m[3]);
    }

    // Resolve each node to a DOM element and group by criterion
    for (var ni = 0; ni < av.nodes.length; ni++) {
      var target = av.nodes[ni].target;
      var el = null;
      if (target && target.length > 0) {
        try { el = document.querySelector(target[target.length - 1]); } catch(e) {}
      }
      if (!el) continue;
      for (var ci = 0; ci < axeCriteria.length; ci++) {
        var crit = axeCriteria[ci];
        if (!axeElementsByCriterion[crit]) axeElementsByCriterion[crit] = new Set();
        axeElementsByCriterion[crit].add(el);
      }
    }
  }

  // --- Process @accesslint/core violations: keep element references for overlap ---
  var alViolMap = {};
  var alElementsByCriterion = {};

  for (var j = 0; j < alResult.alViolationsRaw.length; j++) {
    var viol = alResult.alViolationsRaw[j];
    if (!alViolMap[viol.ruleId]) {
      alViolMap[viol.ruleId] = { ruleId: viol.ruleId, count: 0, impact: viol.impact };
    }
    alViolMap[viol.ruleId].count++;

    // Resolve selector to DOM element and group by criterion
    var alEl = null;
    if (viol.selector) {
      try { alEl = document.querySelector(viol.selector); } catch(e) {}
    }
    var alCriteria = alRuleWcagMap[viol.ruleId] || [];
    for (var aci = 0; aci < alCriteria.length; aci++) {
      var ac = alCriteria[aci];
      if (!alElementsByCriterion[ac]) alElementsByCriterion[ac] = new Set();
      if (alEl) alElementsByCriterion[ac].add(alEl);
    }
  }
  var alViolations = Object.values(alViolMap);

  // --- Compute element-level overlap per criterion ---
  var elementOverlap = {};
  var allOverlapCriteria = {};
  for (var k in axeElementsByCriterion) allOverlapCriteria[k] = true;
  for (var k in alElementsByCriterion) allOverlapCriteria[k] = true;

  for (var oc in allOverlapCriteria) {
    var axeSet = axeElementsByCriterion[oc] || new Set();
    var alSet = alElementsByCriterion[oc] || new Set();
    if (axeSet.size === 0 && alSet.size === 0) continue;
    var intersection = 0;
    alSet.forEach(function(el) { if (axeSet.has(el)) intersection++; });
    elementOverlap[oc] = {
      intersection: intersection,
      union: axeSet.size + alSet.size - intersection
    };
  }

  return {
    domElementCount: domElementCount,
    axeTimeMs: axeResult.axeTimeMs,
    alTimeMs: alResult.alTimeMs,
    axeStatus: axeResult.axeStatus,
    alStatus: alResult.alStatus,
    axeError: axeResult.axeError,
    alError: alResult.alError,
    axeViolations: axeViolations,
    alViolations: alViolations,
    alRuleWcagMap: alRuleWcagMap,
    elementOverlap: elementOverlap
  };
})()`;
}

/** Map raw browser results to WCAG criteria and build per-criterion detail. */
function buildCriteriaDetail(raw: BrowserAuditResult): {
  axeWcag: string[];
  alWcag: string[];
  detail: CriterionPageResult[];
} {
  const axeWcagSet = new Set<string>();
  const axeCriteriaToRules = new Map<string, string[]>();
  const axeCriteriaNodeCount = new Map<string, number>();
  for (const v of raw.axeViolations) {
    const criteria = deduplicateOverlapping(extractAxeWcagCriteria(v.tags));
    for (const c of criteria) {
      axeWcagSet.add(c);
      const existing = axeCriteriaToRules.get(c) ?? [];
      existing.push(v.id);
      axeCriteriaToRules.set(c, existing);
      axeCriteriaNodeCount.set(c, (axeCriteriaNodeCount.get(c) ?? 0) + v.nodeCount);
    }
  }

  const alWcagSet = new Set<string>();
  const alCriteriaToRules = new Map<string, string[]>();
  const alCriteriaNodeCount = new Map<string, number>();
  for (const v of raw.alViolations) {
    const criteria = raw.alRuleWcagMap[v.ruleId] ?? [];
    for (const c of criteria) {
      alWcagSet.add(c);
      const existing = alCriteriaToRules.get(c) ?? [];
      existing.push(v.ruleId);
      alCriteriaToRules.set(c, existing);
      alCriteriaNodeCount.set(c, (alCriteriaNodeCount.get(c) ?? 0) + v.count);
    }
  }

  const allCriteria = new Set([...axeWcagSet, ...alWcagSet]);
  const detail: CriterionPageResult[] = [...allCriteria].sort().map((criterion) => {
    const overlap = raw.elementOverlap[criterion];
    return {
      criterion,
      axeFound: axeWcagSet.has(criterion),
      alFound: alWcagSet.has(criterion),
      axeRuleIds: axeCriteriaToRules.get(criterion) ?? [],
      alRuleIds: alCriteriaToRules.get(criterion) ?? [],
      axeNodeCount: axeCriteriaNodeCount.get(criterion) ?? 0,
      alNodeCount: alCriteriaNodeCount.get(criterion) ?? 0,
      elementIntersection: overlap?.intersection ?? 0,
      elementUnion: overlap?.union ?? 0,
    };
  });

  return {
    axeWcag: [...axeWcagSet].sort(),
    alWcag: [...alWcagSet].sort(),
    detail,
  };
}

/** Audit a single site with axe-core and @accesslint/core. */
export async function auditSite(
  context: BrowserContext,
  origin: string,
  rank: number,
  timeout: number,
): Promise<SiteResult> {
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);

  // Hard deadline: if anything hangs beyond 2x the per-site timeout, force-close the page.
  const hardTimeout = timeout * 2;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      page.close({ runBeforeUnload: false }).catch(() => {});
      reject(new Error(`hard timeout after ${hardTimeout}ms`));
    }, hardTimeout);
  });

  try {
    const result = await Promise.race([
      deadline,
      (async (): Promise<SiteResult> => {
        await page.goto(origin, { waitUntil: "domcontentloaded", timeout });

        // Wait for DOM to stabilize (SPA rendering) — up to 3s hard cap
        // Uses a string to avoid tsx __name transforms on arrow functions
        await page.evaluate(`new Promise(function(resolve) {
        var lastCount = document.querySelectorAll('*').length;
        var stableFrames = 0;
        var maxWait = setTimeout(resolve, 3000);
        function check() {
          var count = document.querySelectorAll('*').length;
          if (count === lastCount) {
            stableFrames++;
            if (stableFrames >= 3) {
              clearTimeout(maxWait);
              resolve();
              return;
            }
          } else {
            stableFrames = 0;
            lastCount = count;
          }
          requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
      })`);

        await page.addScriptTag({ path: AXE_PATH });
        await page.addScriptTag({ path: AL_PATH });

        const raw: BrowserAuditResult = await page.evaluate(buildAuditCode(timeout));
        const { axeWcag, alWcag, detail } = buildCriteriaDetail(raw);

        const axeViolationCount = raw.axeViolations.reduce((sum, v) => sum + v.nodeCount, 0);
        const alViolationCount = raw.alViolations.reduce((sum, v) => sum + v.count, 0);

        return {
          origin,
          rank,
          status: "ok",
          domElementCount: raw.domElementCount,
          axeTimeMs: raw.axeTimeMs,
          alTimeMs: raw.alTimeMs,
          axeStatus: raw.axeStatus,
          alStatus: raw.alStatus,
          axeError: raw.axeError,
          alError: raw.alError,
          axeViolationCount,
          alViolationCount,
          axeWcagCriteria: axeWcag,
          alWcagCriteria: alWcag,
          criteriaDetail: detail,
          timestamp: new Date().toISOString(),
        };
      })(),
    ]);
    return result;
  } catch (err) {
    return {
      origin,
      rank,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      domElementCount: 0,
      axeTimeMs: 0,
      alTimeMs: 0,
      axeStatus: "error",
      alStatus: "error",
      axeError: null,
      alError: null,
      axeViolationCount: 0,
      alViolationCount: 0,
      axeWcagCriteria: [],
      alWcagCriteria: [],
      criteriaDetail: [],
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
    await Promise.race([page.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]);
  }
}
