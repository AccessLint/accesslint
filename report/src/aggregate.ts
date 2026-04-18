/**
 * Roll history records into report-friendly shapes.
 *
 * Produces per-snapshot time series (each record is one data point), a flat
 * per-rule rollup (how often each ruleId appeared / was fixed), and a
 * top-level summary. Rule metadata (WCAG, level, description) is joined in
 * from `@accesslint/core` at report time so the sidecar stays minimal.
 */
import { getRuleById } from "@accesslint/core";
import type { HistoryRecord } from "./history.js";

export interface RuleRollup {
  ruleId: string;
  addedCount: number;
  removedCount: number;
  netChange: number;
  wcag: string[];
  level: "A" | "AA" | "AAA" | "unknown";
  description?: string;
}

export interface SnapshotTimelinePoint {
  ts: string;
  event: HistoryRecord["event"];
  total: number;
  added: number;
  removed: number;
  addedRules: string[];
  removedRules: string[];
}

export interface SnapshotTimeline {
  name: string;
  firstSeen: string;
  lastSeen: string;
  currentTotal: number;
  eventCount: number;
  points: SnapshotTimelinePoint[];
}

export interface ReportSummary {
  snapshotCount: number;
  eventCount: number;
  createdCount: number;
  ratchetCount: number;
  forceUpdateCount: number;
  totalAdded: number;
  totalRemoved: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

export interface Report {
  generatedAt: string;
  summary: ReportSummary;
  snapshots: SnapshotTimeline[];
  rules: RuleRollup[];
}

export function aggregate(records: HistoryRecord[]): Report {
  const snapshots = buildSnapshotTimelines(records);
  const rules = buildRuleRollups(records);
  const summary = buildSummary(records, snapshots);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    snapshots,
    rules,
  };
}

function buildSnapshotTimelines(records: HistoryRecord[]): SnapshotTimeline[] {
  const byName = new Map<string, HistoryRecord[]>();
  for (const r of records) {
    const bucket = byName.get(r.name);
    if (bucket) bucket.push(r);
    else byName.set(r.name, [r]);
  }

  const timelines: SnapshotTimeline[] = [];
  for (const [name, bucket] of byName) {
    const points: SnapshotTimelinePoint[] = bucket.map((r) => ({
      ts: r.ts,
      event: r.event,
      total: r.total,
      added: r.added,
      removed: r.removed,
      addedRules: r.addedRules,
      removedRules: r.removedRules,
    }));
    const last = bucket[bucket.length - 1];
    timelines.push({
      name,
      firstSeen: bucket[0].ts,
      lastSeen: last.ts,
      currentTotal: last.total,
      eventCount: bucket.length,
      points,
    });
  }

  timelines.sort((a, b) => a.name.localeCompare(b.name));
  return timelines;
}

function buildRuleRollups(records: HistoryRecord[]): RuleRollup[] {
  const added = new Map<string, number>();
  const removed = new Map<string, number>();

  for (const r of records) {
    for (const id of r.addedRules) added.set(id, (added.get(id) ?? 0) + 1);
    for (const id of r.removedRules) removed.set(id, (removed.get(id) ?? 0) + 1);
  }

  const ids = new Set<string>([...added.keys(), ...removed.keys()]);
  const rollups: RuleRollup[] = [];
  for (const ruleId of ids) {
    const a = added.get(ruleId) ?? 0;
    const r = removed.get(ruleId) ?? 0;
    const meta = getRuleById(ruleId);
    rollups.push({
      ruleId,
      addedCount: a,
      removedCount: r,
      netChange: a - r,
      wcag: meta?.wcag ?? [],
      level: meta?.level ?? "unknown",
      description: meta?.description,
    });
  }

  rollups.sort(
    (a, b) => Math.abs(b.netChange) - Math.abs(a.netChange) || a.ruleId.localeCompare(b.ruleId),
  );
  return rollups;
}

function buildSummary(records: HistoryRecord[], snapshots: SnapshotTimeline[]): ReportSummary {
  let totalAdded = 0;
  let totalRemoved = 0;
  let createdCount = 0;
  let ratchetCount = 0;
  let forceUpdateCount = 0;

  for (const r of records) {
    totalAdded += r.added;
    totalRemoved += r.removed;
    if (r.event === "created") createdCount++;
    else if (r.event === "ratchet-down") ratchetCount++;
    else if (r.event === "force-update") forceUpdateCount++;
  }

  return {
    snapshotCount: snapshots.length,
    eventCount: records.length,
    createdCount,
    ratchetCount,
    forceUpdateCount,
    totalAdded,
    totalRemoved,
    firstSeen: records[0]?.ts ?? null,
    lastSeen: records[records.length - 1]?.ts ?? null,
  };
}
