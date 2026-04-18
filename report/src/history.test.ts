import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  discoverHistoryFiles,
  loadAllHistory,
  parseHistory,
  type HistoryRecord,
} from "./history.js";

function tempDir(): string {
  const d = join(
    tmpdir(),
    `accesslint-report-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(d, { recursive: true });
  return d;
}

describe("parseHistory", () => {
  it("parses well-formed NDJSON", () => {
    const text =
      JSON.stringify({
        ts: "2026-04-01T00:00:00Z",
        name: "home",
        event: "created",
        added: 3,
        removed: 0,
        total: 3,
        addedRules: ["a/b"],
        removedRules: [],
      }) + "\n";
    const records = parseHistory(text);
    expect(records).toHaveLength(1);
    expect(records[0].event).toBe("created");
  });

  it("skips malformed lines without throwing", () => {
    const good = JSON.stringify({
      ts: "2026-04-01T00:00:00Z",
      name: "home",
      event: "created",
      added: 1,
      removed: 0,
      total: 1,
      addedRules: [],
      removedRules: [],
    });
    const text = `not json\n${good}\n{"partial": true}\n`;
    const records = parseHistory(text);
    expect(records).toHaveLength(1);
  });

  it("rejects records with wrong field types", () => {
    const bad = JSON.stringify({
      ts: "2026-04-01T00:00:00Z",
      name: "home",
      event: "created",
      added: "three",
      removed: 0,
      total: 3,
      addedRules: [],
      removedRules: [],
    });
    expect(parseHistory(bad + "\n")).toHaveLength(0);
  });

  it("rejects unknown event types", () => {
    const bad = JSON.stringify({
      ts: "2026-04-01T00:00:00Z",
      name: "home",
      event: "mystery",
      added: 1,
      removed: 0,
      total: 1,
      addedRules: [],
      removedRules: [],
    });
    expect(parseHistory(bad + "\n")).toHaveLength(0);
  });
});

describe("discoverHistoryFiles", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("finds .history.ndjson at root", () => {
    dir = tempDir();
    writeFileSync(join(dir, ".history.ndjson"), "");
    expect(discoverHistoryFiles(dir)).toEqual([join(dir, ".history.ndjson")]);
  });

  it("finds nested .history.ndjson files one level down", () => {
    dir = tempDir();
    mkdirSync(join(dir, "web"));
    mkdirSync(join(dir, "mobile"));
    writeFileSync(join(dir, "web", ".history.ndjson"), "");
    writeFileSync(join(dir, "mobile", ".history.ndjson"), "");
    const found = discoverHistoryFiles(dir);
    expect(found).toHaveLength(2);
    expect(found).toContain(join(dir, "web", ".history.ndjson"));
    expect(found).toContain(join(dir, "mobile", ".history.ndjson"));
  });

  it("returns [] when root does not exist", () => {
    expect(discoverHistoryFiles("/nonexistent/path")).toEqual([]);
  });
});

describe("loadAllHistory", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("sorts records by timestamp ascending", () => {
    dir = tempDir();
    const rec = (ts: string, name: string) =>
      JSON.stringify({
        ts,
        name,
        event: "created",
        added: 0,
        removed: 0,
        total: 0,
        addedRules: [],
        removedRules: [],
      });
    writeFileSync(
      join(dir, ".history.ndjson"),
      [
        rec("2026-04-03T00:00:00Z", "c"),
        rec("2026-04-01T00:00:00Z", "a"),
        rec("2026-04-02T00:00:00Z", "b"),
      ].join("\n") + "\n",
    );
    const loaded = loadAllHistory(dir);
    expect(loaded.map((r: HistoryRecord) => r.name)).toEqual(["a", "b", "c"]);
  });
});
