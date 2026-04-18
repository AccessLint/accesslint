/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  compareViolations,
  evaluateSnapshot,
  loadSnapshot,
  resolveSnapshotPath,
  saveSnapshot,
  validateSnapshotName,
  type SnapshotViolation,
} from "./snapshot";

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
