/**
 * Snapshot baselines — capture current violations and only fail on regressions.
 *
 * Identity = `ruleId + getSelector(v.element)`. Because vitest runs in
 * jsdom/happy-dom with no browser injection, we use core's tag-path-based
 * selector generator instead of Playwright's role-based `generateSelectorSimple`.
 * Baselines are more sensitive to DOM refactors as a result — document that
 * tradeoff in the README.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Violation } from "@accesslint/core";
import { stableSelector } from "./audit";

export interface SnapshotViolation {
  ruleId: string;
  selector: string;
}

export interface SnapshotResult {
  pass: boolean;
  newViolations: SnapshotViolation[];
  fixedViolations: SnapshotViolation[];
  updated: boolean;
  created: boolean;
}

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

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

export function loadSnapshot(path: string): SnapshotViolation[] | null {
  try {
    const data = readFileSync(path, "utf-8");
    return JSON.parse(data);
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
}

// ---------------------------------------------------------------------------
// Comparison (count-based so duplicate ruleId+selector pairs are preserved)
// ---------------------------------------------------------------------------

function violationKey(v: SnapshotViolation): string {
  return `${v.ruleId}\0${v.selector}`;
}

export function compareViolations(
  current: SnapshotViolation[],
  baseline: SnapshotViolation[],
): { newViolations: SnapshotViolation[]; fixedViolations: SnapshotViolation[] } {
  const baselineCounts = new Map<string, number>();
  for (const v of baseline) {
    const key = violationKey(v);
    baselineCounts.set(key, (baselineCounts.get(key) ?? 0) + 1);
  }

  const remaining = new Map(baselineCounts);
  const newViolations: SnapshotViolation[] = [];
  for (const v of current) {
    const key = violationKey(v);
    const count = remaining.get(key) ?? 0;
    if (count > 0) {
      remaining.set(key, count - 1);
    } else {
      newViolations.push(v);
    }
  }

  const currentCounts = new Map<string, number>();
  for (const v of current) {
    const key = violationKey(v);
    currentCounts.set(key, (currentCounts.get(key) ?? 0) + 1);
  }

  const remainingCurrent = new Map(currentCounts);
  const fixedViolations: SnapshotViolation[] = [];
  for (const v of baseline) {
    const key = violationKey(v);
    const count = remainingCurrent.get(key) ?? 0;
    if (count > 0) {
      remainingCurrent.set(key, count - 1);
    } else {
      fixedViolations.push(v);
    }
  }

  return { newViolations, fixedViolations };
}

// ---------------------------------------------------------------------------
// Evaluate (create / compare / ratchet / update)
// ---------------------------------------------------------------------------

export function evaluateSnapshot(
  currentViolations: SnapshotViolation[],
  snapshotPath: string,
  options?: { update?: boolean },
): SnapshotResult {
  const update = options?.update ?? false;
  const baseline = loadSnapshot(snapshotPath);

  // First run — create baseline, test passes
  if (baseline === null) {
    saveSnapshot(snapshotPath, currentViolations);
    return {
      pass: true,
      newViolations: [],
      fixedViolations: [],
      updated: false,
      created: true,
    };
  }

  // Force update via ACCESSLINT_UPDATE=1 or vitest -u
  if (update) {
    saveSnapshot(snapshotPath, currentViolations);
    return {
      pass: true,
      newViolations: [],
      fixedViolations: [],
      updated: true,
      created: false,
    };
  }

  const { newViolations, fixedViolations } = compareViolations(currentViolations, baseline);

  // Ratchet down automatically — only when no new violations were introduced
  if (newViolations.length === 0 && fixedViolations.length > 0) {
    saveSnapshot(snapshotPath, currentViolations);
  }

  return {
    pass: newViolations.length === 0,
    newViolations,
    fixedViolations,
    updated: fixedViolations.length > 0 && newViolations.length === 0,
    created: false,
  };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function toSnapshotViolations(violations: Violation[]): SnapshotViolation[] {
  return violations.map((v) => ({
    ruleId: v.ruleId,
    selector: stableSelector(v),
  }));
}

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
    const expectRef = (globalThis as { expect?: { getState?: () => { snapshotState?: { _updateSnapshot?: string } } } }).expect;
    const state = expectRef?.getState?.();
    const mode = state?.snapshotState?._updateSnapshot;
    return mode === "all" || mode === "new";
  } catch {
    return false;
  }
}
