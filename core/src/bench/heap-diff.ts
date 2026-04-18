import type { CDPSession } from "@playwright/test";

/**
 * V8 heap snapshot JSON format — the same shape Chrome DevTools'
 * HeapProfiler domain emits and the same format `.heapsnapshot` files
 * use. We only need node metadata (type + name) for counting retained
 * objects by class; edge and retainer info is ignored.
 *
 * Reference: https://v8.dev/blog/trash-talk, and the live format
 * definition in Chromium's `include/v8-profiler.h`.
 */
export interface HeapSnapshot {
  snapshot: {
    meta: {
      node_fields: string[];
      node_types: (string | string[])[];
    };
  };
  nodes: number[];
  strings: string[];
}

/**
 * Drive the CDP HeapProfiler domain to produce a snapshot, concatenate
 * the streamed chunks, and parse. Caller is responsible for calling
 * `HeapProfiler.enable` once per session (idempotent) and
 * `HeapProfiler.collectGarbage` beforehand if a clean baseline matters.
 */
export async function takeHeapSnapshot(cdp: CDPSession): Promise<HeapSnapshot> {
  const chunks: string[] = [];
  const onChunk = (event: { chunk: string }) => chunks.push(event.chunk);
  cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk);
  try {
    await cdp.send("HeapProfiler.takeHeapSnapshot", {
      reportProgress: false,
      captureNumericValue: false,
    });
  } finally {
    cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk);
  }
  return JSON.parse(chunks.join("")) as HeapSnapshot;
}

/**
 * Walk the flat `nodes` array (stride = node_fields.length) and count
 * how many nodes of each class name exist. Only `object` and `native`
 * nodes carry a meaningful constructor name; strings/arrays/hidden
 * etc. are skipped.
 */
export function countByClass(snap: HeapSnapshot): Map<string, number> {
  const { node_fields, node_types } = snap.snapshot.meta;
  const stride = node_fields.length;
  const typeIdx = node_fields.indexOf("type");
  const nameIdx = node_fields.indexOf("name");
  if (typeIdx === -1 || nameIdx === -1) {
    throw new Error("heap snapshot missing type or name in node_fields");
  }
  const typeEnum = node_types[typeIdx];
  if (!Array.isArray(typeEnum)) {
    throw new Error("node_fields[type] entry is not an enum array");
  }
  const counts = new Map<string, number>();
  const { nodes, strings } = snap;
  for (let i = 0; i < nodes.length; i += stride) {
    const typeName = typeEnum[nodes[i + typeIdx]];
    if (typeName !== "object" && typeName !== "native") continue;
    const name = strings[nodes[i + nameIdx]];
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

/**
 * Per-class delta between two snapshots. Returns only classes whose
 * count changed — positive values mean growth (potential leak),
 * negative values mean more was freed than created.
 */
export function diffCounts(
  before: Map<string, number>,
  after: Map<string, number>,
): Map<string, number> {
  const delta = new Map<string, number>();
  const allKeys = new Set([...before.keys(), ...after.keys()]);
  for (const name of allKeys) {
    const b = before.get(name) ?? 0;
    const a = after.get(name) ?? 0;
    if (a !== b) delta.set(name, a - b);
  }
  return delta;
}

/**
 * Pretty-print the top N classes by absolute delta. Useful for
 * diagnostic test output and PR comment bodies.
 */
export function formatTopDeltas(delta: Map<string, number>, top = 20): string {
  const sorted = [...delta.entries()].sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));
  const lines = sorted.slice(0, top).map(([name, n]) => {
    const sign = n > 0 ? "+" : "";
    return `  ${sign}${n}\t${name}`;
  });
  return lines.join("\n");
}
