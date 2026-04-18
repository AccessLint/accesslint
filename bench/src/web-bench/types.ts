/** Per-site raw result — one line of JSONL output */
export interface SiteResult {
  origin: string;
  rank: number;
  status: "ok" | "error";
  error?: string;
  domElementCount: number;
  axeTimeMs: number;
  alTimeMs: number;
  axeStatus: "ok" | "error";
  alStatus: "ok" | "error";
  axeError: string | null;
  alError: string | null;
  axeViolationCount: number;
  alViolationCount: number;
  /** WCAG criteria found by axe-core, e.g. ["1.1.1", "4.1.2"] */
  axeWcagCriteria: string[];
  /** WCAG criteria found by @accesslint/core */
  alWcagCriteria: string[];
  criteriaDetail: CriterionPageResult[];
  timestamp: string;
}

/** Per-criterion detail for a single page */
export interface CriterionPageResult {
  criterion: string;
  axeFound: boolean;
  alFound: boolean;
  axeRuleIds: string[];
  alRuleIds: string[];
  axeNodeCount: number;
  alNodeCount: number;
  elementIntersection: number;
  elementUnion: number;
}

/** What page.evaluate returns from the browser context */
export interface BrowserAuditResult {
  domElementCount: number;
  axeTimeMs: number;
  alTimeMs: number;
  axeStatus: "ok" | "error";
  alStatus: "ok" | "error";
  axeError: string | null;
  alError: string | null;
  axeViolations: { id: string; tags: string[]; nodeCount: number; impact: string | null }[];
  alViolations: { ruleId: string; count: number; impact: string }[];
  alRuleWcagMap: Record<string, string[]>;
  elementOverlap: Record<string, { intersection: number; union: number }>;
}

/** Aggregate concordance for a single WCAG criterion across all sites */
export interface CriterionConcordance {
  criterion: string;
  both: number;
  axeOnly: number;
  alOnly: number;
  neither: number;
  axeAlKappa: number;
  pabak: number;
  medianDepthRatio: number;
  medianJaccard: number;
  sampleSize: number;
  kappaCI: [number, number];
}

export interface BenchOptions {
  sampleSize: number;
  concurrency: number;
  timeout: number;
  outputFile: string;
  seed?: number;
  shardIndex?: number;
  shardTotal?: number;
}
