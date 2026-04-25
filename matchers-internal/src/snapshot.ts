/**
 * Snapshot baselines — capture current violations and only fail on regressions.
 *
 * Identity starts at `ruleId + selector` (T1) and falls back through a
 * tiered multi-signal matcher from `@accesslint/heal-diff`: anchor,
 * role, visual fingerprint, HTML fingerprint, relative-location. When
 * a non-exact tier matches we auto-heal (rewrite the baseline's selector
 * + signals) instead of treating the violation as fixed + new.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import type { Violation } from "@accesslint/core";
import { diff } from "@accesslint/heal-diff";
import type { DiffItem, DiffResult } from "@accesslint/heal-diff";
import { stableSelector } from "./audit";
import {
  accesslintTiers,
  buildRelativeLocation,
  extractAnchor,
  snapshotViolationToDiffItem,
  violationToDiffItem,
} from "./signals";
import type { AccesslintSignal } from "./signals";
import { getAccessibleName, getComputedRole, getHtmlSnippet } from "@accesslint/core";
import { normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";

export interface SnapshotViolation {
  ruleId: string;
  selector: string;
  anchor?: string;
  role?: string;
  visualFingerprint?: string;
  screenshotPath?: string;
  htmlFingerprint?: string;
  relativeLocation?: string;
  tag?: string;
}

export interface HealedViolation {
  ruleId: string;
  oldSelector: string;
  newSelector: string;
  tier: string;
}

export interface LikelyMovedHint {
  ruleId: string;
  current: SnapshotViolation;
  candidate: SnapshotViolation;
  sharedSignals: string[];
}

export interface RefreshedViolation {
  ruleId: string;
  selector: string;
  changedFields: string[];
}

export interface SnapshotResult {
  pass: boolean;
  newViolations: SnapshotViolation[];
  fixedViolations: SnapshotViolation[];
  healed: HealedViolation[];
  refreshed: RefreshedViolation[];
  likelyMoved: LikelyMovedHint[];
  updated: boolean;
  created: boolean;
}

export type HistoryEvent = "created" | "ratchet-down" | "force-update" | "healed" | "refreshed";

export interface HistoryRecord {
  ts: string;
  name: string;
  event: HistoryEvent;
  added: number;
  removed: number;
  total: number;
  addedRules: string[];
  removedRules: string[];
  healedTier?: string;
  refreshedFields?: string[];
}

export const HISTORY_FILENAME = ".history.ndjson";

// ---------------------------------------------------------------------------
// Name + path
// ---------------------------------------------------------------------------

export function validateSnapshotName(name: string): void {
  if (!name || typeof name !== "string") {
    throw new Error("Snapshot name must be a non-empty string");
  }
  if (/[/\\:*?"<>|]/.test(name)) {
    throw new Error(
      `Snapshot name "${name}" contains invalid characters ` +
        `(path separators and special characters are not allowed)`,
    );
  }
}

export function resolveSnapshotPath(name: string, dir?: string): string {
  validateSnapshotName(name);
  const base = dir || resolve(process.cwd(), "accessibility-snapshots");
  return resolve(base, `${name}.json`);
}

function snapshotNameFromPath(snapshotPath: string): string {
  return (
    snapshotPath
      .replace(/\.json$/i, "")
      .split(/[/\\]/)
      .pop() ?? snapshotPath
  );
}

export function screenshotsDirFor(snapshotPath: string): string {
  const name = basename(snapshotPath).replace(/\.json$/i, "");
  return resolve(dirname(snapshotPath), `${name}-screenshots`);
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

export function loadSnapshot(path: string): SnapshotViolation[] | null {
  try {
    const data = readFileSync(path, "utf-8");
    const parsed: unknown = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed as SnapshotViolation[];
    return null;
  } catch {
    return null;
  }
}

export function saveSnapshot(path: string, violations: SnapshotViolation[]): void {
  const sorted = [...violations].sort(
    (a, b) => a.ruleId.localeCompare(b.ruleId) || a.selector.localeCompare(b.selector),
  );
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n");
  runScreenshotGC(path, sorted);
}

function runScreenshotGC(snapshotPath: string, current: SnapshotViolation[]): void {
  const dir = screenshotsDirFor(snapshotPath);
  if (!existsSync(dir)) return;
  const referenced = new Set<string>();
  for (const v of current) {
    if (v.screenshotPath) referenced.add(basename(v.screenshotPath));
  }
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".png")) continue;
    if (!referenced.has(entry)) {
      rmSync(resolve(dir, entry), { force: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Sidecar history (append-only NDJSON)
// ---------------------------------------------------------------------------

function uniqueRules(violations: SnapshotViolation[]): string[] {
  const set = new Set<string>();
  for (const v of violations) set.add(v.ruleId);
  return [...set].sort();
}

export function historyPathFor(snapshotPath: string): string {
  return resolve(dirname(snapshotPath), HISTORY_FILENAME);
}

export function appendHistory(snapshotPath: string, record: HistoryRecord): void {
  const path = historyPathFor(snapshotPath);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(record) + "\n");
}

// ---------------------------------------------------------------------------
// Comparison (tiered via heal-diff; T1 alone reproduces legacy semantics)
// ---------------------------------------------------------------------------

function toDiffItems(list: SnapshotViolation[]): DiffItem<AccesslintSignal>[] {
  return list.map((v) => snapshotViolationToDiffItem(v));
}

const REFRESHABLE_FIELDS: (keyof SnapshotViolation)[] = [
  "anchor",
  "role",
  "visualFingerprint",
  "screenshotPath",
  "htmlFingerprint",
  "relativeLocation",
  "tag",
];

function driftedSignalFields(baseline: SnapshotViolation, current: SnapshotViolation): string[] {
  const out: string[] = [];
  for (const field of REFRESHABLE_FIELDS) {
    const b = baseline[field];
    const c = current[field];
    // Only count as drift when current has a value that differs from baseline.
    // If current lacks a signal that baseline had, keep baseline (don't erase).
    if (c != null && c !== "" && c !== b) out.push(field);
  }
  return out;
}

/**
 * Carry forward the baseline entry with any non-empty signal updates from
 * current overlaid. Baseline-only signals are preserved (current may lack
 * them transiently when the element detaches or ARIA info is unavailable).
 */
function mergedForRefresh(baseline: SnapshotViolation, current: SnapshotViolation): SnapshotViolation {
  const out: SnapshotViolation = { ...baseline, selector: current.selector };
  for (const field of REFRESHABLE_FIELDS) {
    const c = current[field];
    if (c != null && c !== "") {
      (out[field] as string | undefined) = c;
    }
  }
  return out;
}

function fromDiffItem(item: DiffItem<AccesslintSignal>): SnapshotViolation {
  // We always stash the original SnapshotViolation in payload, so recovery
  // is just a cast. Fall back to reconstructing from signals if missing.
  if (item.payload && typeof item.payload === "object" && "ruleId" in item.payload) {
    return item.payload as SnapshotViolation;
  }
  const { signals } = item;
  const out: SnapshotViolation = { ruleId: item.id, selector: signals.selector ?? "" };
  if (signals.anchor) out.anchor = signals.anchor;
  if (signals.role) out.role = signals.role;
  if (signals.visualFingerprint) out.visualFingerprint = signals.visualFingerprint;
  if (signals.htmlFingerprint) out.htmlFingerprint = signals.htmlFingerprint;
  if (signals.relativeLocation) out.relativeLocation = signals.relativeLocation;
  if (signals.tag) out.tag = signals.tag;
  return out;
}

/**
 * Compare baseline to current using the full accesslint tier list.
 * Returns new / fixed / healed / likelyMoved plus the reconciled baseline
 * that callers should persist (healed entries replaced with their
 * current-run counterparts, matched entries carried forward, fixed
 * entries dropped).
 */
export function diffSnapshots(
  current: SnapshotViolation[],
  baseline: SnapshotViolation[],
): {
  newViolations: SnapshotViolation[];
  fixedViolations: SnapshotViolation[];
  healed: HealedViolation[];
  refreshed: RefreshedViolation[];
  likelyMoved: LikelyMovedHint[];
  reconciledBaseline: SnapshotViolation[];
  raw: DiffResult<AccesslintSignal>;
} {
  const result = diff<AccesslintSignal>(
    toDiffItems(baseline),
    toDiffItems(current),
    accesslintTiers(),
    { grouping: { by: ["anchor", "htmlFingerprint"] } },
  );

  const newViolations = result.new.map(fromDiffItem);
  const fixedViolations = result.fixed.map(fromDiffItem);

  const healed: HealedViolation[] = result.healed.map((pair) => ({
    ruleId: pair.current.id,
    oldSelector: pair.baseline.signals.selector ?? "",
    newSelector: pair.current.signals.selector ?? "",
    tier: pair.tier,
  }));

  const likelyMoved: LikelyMovedHint[] = result.likelyMoved.map((lm) => ({
    ruleId: lm.current.id,
    current: fromDiffItem(lm.current),
    candidate: fromDiffItem(lm.candidate),
    sharedSignals: lm.sharedSignals,
  }));

  // Reconciled baseline: exact matches carry forward but refresh any signals
  // that drifted since baseline was written (otherwise non-T1 signals rot
  // across quiet periods and auto-heal reliability slowly degrades); healed
  // entries get replaced wholesale; new entries ignored (failure path); fixed
  // entries dropped.
  const refreshed: RefreshedViolation[] = [];
  const reconciledBaseline: SnapshotViolation[] = [];
  for (const pair of result.matched) {
    const baselineSV = fromDiffItem(pair.baseline);
    const currentSV = fromDiffItem(pair.current);
    const changedFields = driftedSignalFields(baselineSV, currentSV);
    if (changedFields.length > 0) {
      refreshed.push({
        ruleId: pair.current.id,
        selector: currentSV.selector,
        changedFields,
      });
      reconciledBaseline.push(mergedForRefresh(baselineSV, currentSV));
    } else {
      reconciledBaseline.push(baselineSV);
    }
  }
  for (const pair of result.healed) reconciledBaseline.push(fromDiffItem(pair.current));

  return {
    newViolations,
    fixedViolations,
    healed,
    refreshed,
    likelyMoved,
    reconciledBaseline,
    raw: result,
  };
}

/**
 * Legacy exact-match comparison retained for consumers that don't need
 * the tiered matcher (and for the pre-existing test suite). Equivalent
 * to running `diff()` with only the T1 exact tier.
 */
export function compareViolations(
  current: SnapshotViolation[],
  baseline: SnapshotViolation[],
): { newViolations: SnapshotViolation[]; fixedViolations: SnapshotViolation[] } {
  const baselineCounts = new Map<string, number>();
  const key = (v: SnapshotViolation) => `${v.ruleId}\u0000${v.selector}`;
  for (const v of baseline) baselineCounts.set(key(v), (baselineCounts.get(key(v)) ?? 0) + 1);

  const remaining = new Map(baselineCounts);
  const newViolations: SnapshotViolation[] = [];
  for (const v of current) {
    const k = key(v);
    const count = remaining.get(k) ?? 0;
    if (count > 0) remaining.set(k, count - 1);
    else newViolations.push(v);
  }

  const currentCounts = new Map<string, number>();
  for (const v of current) currentCounts.set(key(v), (currentCounts.get(key(v)) ?? 0) + 1);
  const remainingCurrent = new Map(currentCounts);
  const fixedViolations: SnapshotViolation[] = [];
  for (const v of baseline) {
    const k = key(v);
    const count = remainingCurrent.get(k) ?? 0;
    if (count > 0) remainingCurrent.set(k, count - 1);
    else fixedViolations.push(v);
  }

  return { newViolations, fixedViolations };
}

// ---------------------------------------------------------------------------
// Evaluate (create / compare / ratchet / heal / update)
// ---------------------------------------------------------------------------

export function evaluateSnapshot(
  currentViolations: SnapshotViolation[],
  snapshotPath: string,
  options?: { update?: boolean; name?: string },
): SnapshotResult {
  const update = options?.update ?? false;
  const name = options?.name ?? snapshotNameFromPath(snapshotPath);
  const baseline = loadSnapshot(snapshotPath);

  // First run — create baseline, test passes
  if (baseline === null) {
    saveSnapshot(snapshotPath, currentViolations);
    appendHistory(snapshotPath, {
      ts: new Date().toISOString(),
      name,
      event: "created",
      added: currentViolations.length,
      removed: 0,
      total: currentViolations.length,
      addedRules: uniqueRules(currentViolations),
      removedRules: [],
    });
    return {
      pass: true,
      newViolations: [],
      fixedViolations: [],
      healed: [],
      refreshed: [],
      likelyMoved: [],
      updated: false,
      created: true,
    };
  }

  const d = diffSnapshots(currentViolations, baseline);

  // Force update via ACCESSLINT_UPDATE=1 or vitest -u
  if (update) {
    saveSnapshot(snapshotPath, currentViolations);
    appendHistory(snapshotPath, {
      ts: new Date().toISOString(),
      name,
      event: "force-update",
      added: d.newViolations.length,
      removed: d.fixedViolations.length,
      total: currentViolations.length,
      addedRules: uniqueRules(d.newViolations),
      removedRules: uniqueRules(d.fixedViolations),
    });
    return {
      pass: true,
      newViolations: [],
      fixedViolations: [],
      healed: [],
      refreshed: [],
      likelyMoved: [],
      updated: true,
      created: false,
    };
  }

  const pass = d.newViolations.length === 0;
  const shouldRewrite =
    pass && (d.fixedViolations.length > 0 || d.healed.length > 0 || d.refreshed.length > 0);

  if (shouldRewrite) {
    saveSnapshot(snapshotPath, d.reconciledBaseline);
    if (d.fixedViolations.length > 0) {
      appendHistory(snapshotPath, {
        ts: new Date().toISOString(),
        name,
        event: "ratchet-down",
        added: 0,
        removed: d.fixedViolations.length,
        total: d.reconciledBaseline.length,
        addedRules: [],
        removedRules: uniqueRules(d.fixedViolations),
      });
    }
    for (const h of d.healed) {
      appendHistory(snapshotPath, {
        ts: new Date().toISOString(),
        name,
        event: "healed",
        added: 0,
        removed: 0,
        total: d.reconciledBaseline.length,
        addedRules: [],
        removedRules: [],
        healedTier: h.tier,
      });
    }
    if (d.refreshed.length > 0) {
      const refreshedFieldSet = new Set<string>();
      for (const r of d.refreshed) for (const f of r.changedFields) refreshedFieldSet.add(f);
      appendHistory(snapshotPath, {
        ts: new Date().toISOString(),
        name,
        event: "refreshed",
        added: 0,
        removed: 0,
        total: d.reconciledBaseline.length,
        addedRules: [],
        removedRules: [],
        refreshedFields: [...refreshedFieldSet].sort(),
      });
    }
  }

  return {
    pass,
    newViolations: d.newViolations,
    fixedViolations: d.fixedViolations,
    healed: d.healed,
    refreshed: d.refreshed,
    likelyMoved: d.likelyMoved,
    updated: shouldRewrite,
    created: false,
  };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function toSnapshotViolations(violations: Violation[]): SnapshotViolation[] {
  return violations.map(toSnapshotViolation);
}

export function toSnapshotViolation(v: Violation): SnapshotViolation {
  const selector = stableSelector(v);
  const out: SnapshotViolation = { ruleId: v.ruleId, selector };

  const el = v.element;
  if (el) {
    const anchor = extractAnchor(el);
    if (anchor) out.anchor = anchor;
    const role = getComputedRole(el);
    if (role) {
      const name = getAccessibleName(el).trim();
      out.role = name ? `${role}[name="${name}"]` : role;
    }
    const rel = buildRelativeLocation(el);
    if (rel) out.relativeLocation = rel;
    out.tag = el.tagName.toLowerCase();
  }

  const html = el ? getHtmlSnippet(el) : v.html;
  if (html) out.htmlFingerprint = sha1Short(normalizeHtml(html));

  return out;
}

// Retain an adapter that goes directly from Violation to DiffItem for
// callers that want to skip the SnapshotViolation intermediate.
export { violationToDiffItem };

/**
 * Detect whether snapshots should be force-updated this run.
 *
 * Triggers:
 * - `ACCESSLINT_UPDATE=1` environment variable
 * - Vitest CLI flag: `vitest run -u` / `--update` (detected via expect.getState())
 */
export function isUpdateMode(): boolean {
  if (process.env.ACCESSLINT_UPDATE === "1") return true;

  try {
    const expectRef = (
      globalThis as {
        expect?: { getState?: () => { snapshotState?: { _updateSnapshot?: string } } };
      }
    ).expect;
    const state = expectRef?.getState?.();
    const mode = state?.snapshotState?._updateSnapshot;
    return mode === "all" || mode === "new";
  } catch {
    return false;
  }
}
