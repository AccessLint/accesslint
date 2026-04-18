/**
 * Parse `.history.ndjson` sidecar files emitted by @accesslint/matchers-internal.
 *
 * The sidecar is append-only NDJSON — one record per snapshot write event
 * (`created`, `ratchet-down`, `force-update`). Malformed lines are skipped
 * with a warning rather than aborting, since the file can be concatenated
 * from merge commits or partially written on a crash.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export type HistoryEvent = "created" | "ratchet-down" | "force-update";

export interface HistoryRecord {
  ts: string;
  name: string;
  event: HistoryEvent;
  added: number;
  removed: number;
  total: number;
  addedRules: string[];
  removedRules: string[];
}

const HISTORY_FILENAME = ".history.ndjson";

/**
 * Parse NDJSON history text. Invalid lines are dropped; callers that want
 * strict parsing can check `returned.length` against the input line count.
 */
export function parseHistory(text: string): HistoryRecord[] {
  const out: HistoryRecord[] = [];
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    try {
      const rec = JSON.parse(line) as Partial<HistoryRecord>;
      if (isValid(rec)) out.push(rec);
    } catch {
      // malformed line — skip
    }
  }
  return out;
}

function isValid(rec: Partial<HistoryRecord>): rec is HistoryRecord {
  return (
    typeof rec.ts === "string" &&
    typeof rec.name === "string" &&
    (rec.event === "created" || rec.event === "ratchet-down" || rec.event === "force-update") &&
    typeof rec.added === "number" &&
    typeof rec.removed === "number" &&
    typeof rec.total === "number" &&
    Array.isArray(rec.addedRules) &&
    Array.isArray(rec.removedRules)
  );
}

/**
 * Read all history records from `<dir>/.history.ndjson`. Returns [] if the
 * file is missing.
 */
export function readHistoryFile(path: string): HistoryRecord[] {
  try {
    const text = readFileSync(path, "utf-8");
    return parseHistory(text);
  } catch {
    return [];
  }
}

/**
 * Discover all history files under `root`. We look in:
 *   1. `<root>/.history.ndjson` — single snapshot directory (the common case)
 *   2. `<root>/*\/.history.ndjson` — nested per-project layout (monorepo)
 *
 * Returns the absolute paths that exist.
 */
export function discoverHistoryFiles(root: string): string[] {
  const abs = resolve(root);
  const paths: string[] = [];

  const direct = join(abs, HISTORY_FILENAME);
  if (fileExists(direct)) paths.push(direct);

  try {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join(abs, entry.name, HISTORY_FILENAME);
      if (fileExists(candidate)) paths.push(candidate);
    }
  } catch {
    // root doesn't exist — return what we have
  }

  return paths;
}

function fileExists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Load every history record reachable from `root`, sorted by timestamp
 * ascending. Records missing a parseable `ts` sort to the end.
 */
export function loadAllHistory(root: string): HistoryRecord[] {
  const records: HistoryRecord[] = [];
  for (const path of discoverHistoryFiles(root)) {
    records.push(...readHistoryFile(path));
  }
  records.sort((a, b) => {
    const ta = Date.parse(a.ts);
    const tb = Date.parse(b.ts);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
  return records;
}
