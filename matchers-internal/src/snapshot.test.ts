/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  compareViolations,
  diffSnapshots,
  evaluateSnapshot,
  historyPathFor,
  HISTORY_FILENAME,
  loadSnapshot,
  resolveSnapshotPath,
  saveSnapshot,
  screenshotsDirFor,
  validateSnapshotName,
  type HistoryRecord,
  type SnapshotViolation,
} from "./snapshot";
import { writeFileSync } from "node:fs";

function readHistory(snapshotPath: string): HistoryRecord[] {
  const path = historyPathFor(snapshotPath);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as HistoryRecord);
}

function tempDir(): string {
  const d = join(
    tmpdir(),
    `accesslint-vitest-snap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(d, { recursive: true });
  return d;
}

describe("validateSnapshotName", () => {
  it("accepts valid names", () => {
    expect(() => validateSnapshotName("homepage")).not.toThrow();
    expect(() => validateSnapshotName("my-page")).not.toThrow();
    expect(() => validateSnapshotName("page_123")).not.toThrow();
  });

  it("rejects empty strings", () => {
    expect(() => validateSnapshotName("")).toThrow(/non-empty/);
  });

  it("rejects path separators and special chars", () => {
    expect(() => validateSnapshotName("foo/bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName("foo\\bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName("foo:bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName('foo"bar')).toThrow(/invalid/i);
  });
});

describe("resolveSnapshotPath", () => {
  it("defaults to accessibility-snapshots dir under cwd", () => {
    const p = resolveSnapshotPath("homepage");
    expect(p).toContain("accessibility-snapshots");
    expect(p).toMatch(/homepage\.json$/);
  });

  it("uses custom directory", () => {
    const p = resolveSnapshotPath("homepage", "/custom/dir");
    expect(p).toBe("/custom/dir/homepage.json");
  });
});

describe("loadSnapshot / saveSnapshot", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("returns null for missing file", () => {
    expect(loadSnapshot("/nonexistent/path.json")).toBeNull();
  });

  it("round-trips and sorts", () => {
    dir = tempDir();
    const path = join(dir, "test.json");
    const violations: SnapshotViolation[] = [
      { ruleId: "b", selector: "html" },
      { ruleId: "a", selector: "html > body > img" },
    ];
    saveSnapshot(path, violations);
    expect(loadSnapshot(path)).toEqual([
      { ruleId: "a", selector: "html > body > img" },
      { ruleId: "b", selector: "html" },
    ]);
  });

  it("creates intermediate dirs", () => {
    dir = tempDir();
    const path = join(dir, "nested", "deep", "t.json");
    saveSnapshot(path, []);
    expect(existsSync(path)).toBe(true);
  });
});

describe("compareViolations", () => {
  it("detects new violations", () => {
    const { newViolations, fixedViolations } = compareViolations(
      [
        { ruleId: "a", selector: "img" },
        { ruleId: "b", selector: "html" },
      ],
      [{ ruleId: "a", selector: "img" }],
    );
    expect(newViolations).toEqual([{ ruleId: "b", selector: "html" }]);
    expect(fixedViolations).toEqual([]);
  });

  it("detects fixed violations", () => {
    const { newViolations, fixedViolations } = compareViolations(
      [{ ruleId: "a", selector: "img" }],
      [
        { ruleId: "a", selector: "img" },
        { ruleId: "b", selector: "html" },
      ],
    );
    expect(newViolations).toEqual([]);
    expect(fixedViolations).toEqual([{ ruleId: "b", selector: "html" }]);
  });

  it("handles duplicate selectors by count", () => {
    const sel = "img";
    const { newViolations, fixedViolations } = compareViolations(
      [
        { ruleId: "a", selector: sel },
        { ruleId: "a", selector: sel },
        { ruleId: "a", selector: sel },
      ],
      [
        { ruleId: "a", selector: sel },
        { ruleId: "a", selector: sel },
      ],
    );
    expect(newViolations).toHaveLength(1);
    expect(fixedViolations).toHaveLength(0);
  });
});

describe("evaluateSnapshot", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("creates baseline on first run", () => {
    dir = tempDir();
    const path = join(dir, "first.json");
    const result = evaluateSnapshot([{ ruleId: "a", selector: "img" }], path);
    expect(result.pass).toBe(true);
    expect(result.created).toBe(true);
    expect(existsSync(path)).toBe(true);
  });

  it("passes when violations match baseline", () => {
    dir = tempDir();
    const path = join(dir, "match.json");
    const v = [{ ruleId: "a", selector: "img" }];
    saveSnapshot(path, v);
    const result = evaluateSnapshot(v, path);
    expect(result.pass).toBe(true);
    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
  });

  it("fails when new violations appear", () => {
    dir = tempDir();
    const path = join(dir, "fail.json");
    saveSnapshot(path, [{ ruleId: "a", selector: "img" }]);
    const result = evaluateSnapshot(
      [
        { ruleId: "a", selector: "img" },
        { ruleId: "b", selector: "html" },
      ],
      path,
    );
    expect(result.pass).toBe(false);
    expect(result.newViolations).toHaveLength(1);
  });

  it("ratchets down on fixed-only changes", () => {
    dir = tempDir();
    const path = join(dir, "ratchet.json");
    saveSnapshot(path, [
      { ruleId: "a", selector: "img" },
      { ruleId: "b", selector: "html" },
    ]);
    const result = evaluateSnapshot([{ ruleId: "a", selector: "img" }], path);
    expect(result.pass).toBe(true);
    expect(result.updated).toBe(true);
    expect(loadSnapshot(path)).toHaveLength(1);
  });

  it("force-update overwrites baseline", () => {
    dir = tempDir();
    const path = join(dir, "force.json");
    saveSnapshot(path, [{ ruleId: "a", selector: "img" }]);
    const result = evaluateSnapshot([{ ruleId: "b", selector: "html" }], path, { update: true });
    expect(result.pass).toBe(true);
    expect(result.updated).toBe(true);
    expect(loadSnapshot(path)).toEqual([{ ruleId: "b", selector: "html" }]);
  });
});

describe("sidecar history", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("appends a 'created' record on first run", () => {
    dir = tempDir();
    const path = join(dir, "first.json");
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path, { name: "first" });
    const history = readHistory(path);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      name: "first",
      event: "created",
      added: 1,
      removed: 0,
      total: 1,
      addedRules: ["a"],
      removedRules: [],
    });
    expect(history[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("appends a 'ratchet-down' record when violations are fixed", () => {
    dir = tempDir();
    const path = join(dir, "ratchet.json");
    evaluateSnapshot(
      [
        { ruleId: "a", selector: "img" },
        { ruleId: "b", selector: "html" },
      ],
      path,
      { name: "ratchet" },
    );
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path, { name: "ratchet" });

    const history = readHistory(path);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      event: "ratchet-down",
      added: 0,
      removed: 1,
      total: 1,
      removedRules: ["b"],
    });
  });

  it("appends a 'force-update' record when update mode overrides a diff", () => {
    dir = tempDir();
    const path = join(dir, "force.json");
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path, { name: "force" });
    evaluateSnapshot([{ ruleId: "b", selector: "html" }], path, {
      name: "force",
      update: true,
    });

    const history = readHistory(path);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      event: "force-update",
      added: 1,
      removed: 1,
      total: 1,
      addedRules: ["b"],
      removedRules: ["a"],
    });
  });

  it("does not append when the snapshot matches (no write)", () => {
    dir = tempDir();
    const path = join(dir, "match.json");
    const v = [{ ruleId: "a", selector: "img" }];
    evaluateSnapshot(v, path, { name: "match" });
    evaluateSnapshot(v, path, { name: "match" });
    expect(readHistory(path)).toHaveLength(1);
  });

  it("does not append when new violations cause failure", () => {
    dir = tempDir();
    const path = join(dir, "fail.json");
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path, { name: "fail" });
    const result = evaluateSnapshot(
      [
        { ruleId: "a", selector: "img" },
        { ruleId: "b", selector: "html" },
      ],
      path,
      { name: "fail" },
    );
    expect(result.pass).toBe(false);
    expect(readHistory(path)).toHaveLength(1);
  });

  it("derives name from path when not provided", () => {
    dir = tempDir();
    const path = join(dir, "login-form.json");
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path);
    const history = readHistory(path);
    expect(history[0].name).toBe("login-form");
  });

  it("writes history beside the snapshot file", () => {
    dir = tempDir();
    const path = join(dir, "nested", "deep", "t.json");
    evaluateSnapshot([{ ruleId: "a", selector: "img" }], path, { name: "t" });
    expect(existsSync(join(dir, "nested", "deep", HISTORY_FILENAME))).toBe(true);
  });
});

describe("diffSnapshots — healing tiers", () => {
  it("heals via anchor when selector changed", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "img-alt", selector: "body > img", anchor: "data-testid=hero" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "img-alt", selector: "main > figure > img", anchor: "data-testid=hero" },
    ];
    const d = diffSnapshots(current, baseline);
    expect(d.healed).toHaveLength(1);
    expect(d.healed[0].tier).toBe("anchor");
    expect(d.healed[0].oldSelector).toBe("body > img");
    expect(d.healed[0].newSelector).toBe("main > figure > img");
    expect(d.newViolations).toHaveLength(0);
    expect(d.fixedViolations).toHaveLength(0);
  });

  it("heals via htmlFingerprint when anchor is absent", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "img-alt", selector: "body > img", htmlFingerprint: "abc" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "img-alt", selector: "main > img", htmlFingerprint: "abc" },
    ];
    const d = diffSnapshots(current, baseline);
    expect(d.healed).toHaveLength(1);
    expect(d.healed[0].tier).toBe("htmlFingerprint");
  });

  it("surfaces likelyMoved when healing fails but signals partially overlap", () => {
    const baseline: SnapshotViolation[] = [
      {
        ruleId: "img-alt",
        selector: "body > header > img",
        tag: "img",
        htmlFingerprint: "abc",
        relativeLocation: "header",
      },
    ];
    const current: SnapshotViolation[] = [
      {
        ruleId: "img-alt",
        selector: "body > footer > img",
        tag: "img",
        htmlFingerprint: "abc",
        relativeLocation: "footer",
      },
    ];
    const d = diffSnapshots(current, baseline);
    expect(d.healed).toHaveLength(1);
    expect(d.healed[0].tier).toBe("htmlFingerprint");
    expect(d.likelyMoved).toHaveLength(0);
  });
});

describe("evaluateSnapshot — healing", () => {
  let dir: string;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it("heals without failing, rewrites baseline, and logs a healed history event", () => {
    dir = tempDir();
    const path = join(dir, "heal.json");
    saveSnapshot(path, [
      { ruleId: "img-alt", selector: "body > img", anchor: "data-testid=hero" },
    ]);
    const result = evaluateSnapshot(
      [{ ruleId: "img-alt", selector: "main > figure > img", anchor: "data-testid=hero" }],
      path,
      { name: "heal" },
    );
    expect(result.pass).toBe(true);
    expect(result.healed).toHaveLength(1);
    expect(result.healed[0].tier).toBe("anchor");
    expect(loadSnapshot(path)?.[0].selector).toBe("main > figure > img");

    const history = readHistory(path);
    const healedEvent = history.find((h) => h.event === "healed");
    expect(healedEvent?.healedTier).toBe("anchor");
  });

  it("runs screenshot GC: removes PNGs not referenced by the persisted baseline", () => {
    dir = tempDir();
    const path = join(dir, "gc.json");
    const screenshotsDir = screenshotsDirFor(path);
    mkdirSync(screenshotsDir, { recursive: true });
    writeFileSync(join(screenshotsDir, "img-alt_hero.png"), "keep");
    writeFileSync(join(screenshotsDir, "img-alt_orphan.png"), "orphan");

    saveSnapshot(path, [
      {
        ruleId: "img-alt",
        selector: "img",
        screenshotPath: "gc-screenshots/img-alt_hero.png",
      },
    ]);

    expect(existsSync(join(screenshotsDir, "img-alt_hero.png"))).toBe(true);
    expect(existsSync(join(screenshotsDir, "img-alt_orphan.png"))).toBe(false);
  });
});
