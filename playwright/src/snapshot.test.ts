import { test, expect } from "@playwright/test";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateSnapshotName,
  resolveSnapshotPath,
  loadSnapshot,
  saveSnapshot,
  compareViolations,
  evaluateSnapshot,
} from "./snapshot";
import type { SnapshotViolation } from "./snapshot";

// Auto-register toBeAccessible matcher
import "./index";

// ── HTML fixtures ──────────────────────────────────────────────────────────

const ACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Accessible</title></head>
<body>
  <main>
    <h1>Hello World</h1>
    <p>This page is accessible.</p>
  </main>
</body>
</html>`;

const INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Inaccessible</title></head>
<body>
  <main>
    <img src="test.png">
    <h1>Hello World</h1>
  </main>
</body>
</html>`;

const EXTRA_VIOLATION_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>More Violations</title></head>
<body>
  <main>
    <img src="a.png">
    <img src="b.png">
    <h1>Hello World</h1>
  </main>
</body>
</html>`;

const SCOPED_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Scoped</title></head>
<body>
  <main>
    <div id="good"><h2>Good</h2><p>OK</p></div>
    <div id="bad"><img src="bad.png"></div>
  </main>
</body>
</html>`;

// ── Helpers ────────────────────────────────────────────────────────────────

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `accesslint-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Unit tests ─────────────────────────────────────────────────────────────

test.describe("validateSnapshotName", () => {
  test("accepts valid names", () => {
    expect(() => validateSnapshotName("homepage")).not.toThrow();
    expect(() => validateSnapshotName("my-page")).not.toThrow();
    expect(() => validateSnapshotName("page_123")).not.toThrow();
    expect(() => validateSnapshotName("Dashboard")).not.toThrow();
  });

  test("rejects empty string", () => {
    expect(() => validateSnapshotName("")).toThrow(/non-empty/);
  });

  test("rejects path separators", () => {
    expect(() => validateSnapshotName("foo/bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName("foo\\bar")).toThrow(/invalid/i);
  });

  test("rejects special characters", () => {
    expect(() => validateSnapshotName("foo:bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName("foo*bar")).toThrow(/invalid/i);
    expect(() => validateSnapshotName('foo"bar')).toThrow(/invalid/i);
  });
});

test.describe("resolveSnapshotPath", () => {
  test("defaults to accessibility-snapshots dir under cwd", () => {
    const path = resolveSnapshotPath("homepage");
    expect(path).toContain("accessibility-snapshots");
    expect(path).toMatch(/homepage\.json$/);
  });

  test("uses custom directory", () => {
    const path = resolveSnapshotPath("homepage", "/custom/dir");
    expect(path).toBe("/custom/dir/homepage.json");
  });
});

test.describe("loadSnapshot / saveSnapshot", () => {
  test("returns null for missing file", () => {
    expect(loadSnapshot("/nonexistent/path.json")).toBeNull();
  });

  test("round-trips and sorts violations", () => {
    const dir = createTempDir();
    const path = join(dir, "test.json");
    const violations: SnapshotViolation[] = [
      { ruleId: "accesslint-080", selector: "html" },
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];

    saveSnapshot(path, violations);
    const loaded = loadSnapshot(path);

    expect(loaded).toEqual([
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
      { ruleId: "accesslint-080", selector: "html" },
    ]);

    rmSync(dir, { recursive: true });
  });

  test("creates intermediate directories", () => {
    const dir = createTempDir();
    const path = join(dir, "nested", "deep", "test.json");
    saveSnapshot(path, []);
    expect(existsSync(path)).toBe(true);
    rmSync(dir, { recursive: true });
  });
});

test.describe("compareViolations", () => {
  test("identical sets → no changes", () => {
    const v: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];
    const { newViolations, fixedViolations } = compareViolations(v, v);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(0);
  });

  test("detects new violations", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
      { ruleId: "accesslint-080", selector: "html" },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(newViolations[0].ruleId).toBe("accesslint-080");
    expect(fixedViolations).toHaveLength(0);
  });

  test("detects fixed violations", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
      { ruleId: "accesslint-080", selector: "html" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(1);
    expect(fixedViolations[0].ruleId).toBe("accesslint-080");
  });

  test("detects both new and fixed", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];
    const current: SnapshotViolation[] = [{ ruleId: "accesslint-080", selector: "html" }];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(fixedViolations).toHaveLength(1);
  });

  test("handles duplicate selectors — added", () => {
    const sel = "getByRole('img')";
    const baseline: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(fixedViolations).toHaveLength(0);
  });

  test("handles duplicate selectors — removed", () => {
    const sel = "getByRole('img')";
    const baseline: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
    ];
    const current: SnapshotViolation[] = [{ ruleId: "accesslint-011", selector: sel }];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(2);
  });

  test("handles duplicate selectors — unchanged count", () => {
    const sel = "getByRole('img')";
    const violations: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: sel },
      { ruleId: "accesslint-011", selector: sel },
    ];

    const { newViolations, fixedViolations } = compareViolations(violations, violations);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(0);
  });
});

test.describe("evaluateSnapshot", () => {
  test("creates snapshot on first run", () => {
    const dir = createTempDir();
    const path = join(dir, "first.json");
    const violations: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];

    const result = evaluateSnapshot(violations, path);
    expect(result.pass).toBe(true);
    expect(result.created).toBe(true);
    expect(existsSync(path)).toBe(true);

    rmSync(dir, { recursive: true });
  });

  test("passes when violations match", () => {
    const dir = createTempDir();
    const path = join(dir, "match.json");
    const violations: SnapshotViolation[] = [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
    ];

    saveSnapshot(path, violations);
    const result = evaluateSnapshot(violations, path);
    expect(result.pass).toBe(true);
    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);

    rmSync(dir, { recursive: true });
  });

  test("fails on new violations", () => {
    const dir = createTempDir();
    const path = join(dir, "new.json");

    saveSnapshot(path, [{ ruleId: "accesslint-011", selector: "html > body > main > img" }]);

    const result = evaluateSnapshot(
      [
        { ruleId: "accesslint-011", selector: "html > body > main > img" },
        { ruleId: "accesslint-080", selector: "html" },
      ],
      path,
    );

    expect(result.pass).toBe(false);
    expect(result.newViolations).toHaveLength(1);

    rmSync(dir, { recursive: true });
  });

  test("ratchets down when violations decrease", () => {
    const dir = createTempDir();
    const path = join(dir, "ratchet.json");

    saveSnapshot(path, [
      { ruleId: "accesslint-011", selector: "html > body > main > img" },
      { ruleId: "accesslint-080", selector: "html" },
    ]);

    const result = evaluateSnapshot(
      [{ ruleId: "accesslint-011", selector: "html > body > main > img" }],
      path,
    );

    expect(result.pass).toBe(true);
    expect(result.updated).toBe(true);

    const updated = loadSnapshot(path);
    expect(updated).toHaveLength(1);

    rmSync(dir, { recursive: true });
  });

  test("force-update overwrites snapshot", () => {
    const dir = createTempDir();
    const path = join(dir, "force.json");

    saveSnapshot(path, [{ ruleId: "accesslint-011", selector: "html > body > main > img" }]);

    const result = evaluateSnapshot([{ ruleId: "accesslint-080", selector: "html" }], path, {
      update: true,
    });

    expect(result.pass).toBe(true);
    expect(result.updated).toBe(true);

    const updated = loadSnapshot(path);
    expect(updated).toEqual([{ ruleId: "accesslint-080", selector: "html" }]);

    rmSync(dir, { recursive: true });
  });
});

// ── Integration tests (full matcher) ───────────────────────────────────────

test.describe("toBeAccessible with snapshot", () => {
  test("first run creates snapshot and passes", async ({ page }) => {
    const dir = createTempDir();

    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "first-run",
      snapshotDir: dir,
    });

    const snapshotPath = join(dir, "first-run.json");
    expect(existsSync(snapshotPath)).toBe(true);

    const snapshot: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    expect(snapshot.length).toBeGreaterThan(0);

    rmSync(dir, { recursive: true });
  });

  test("second run with same violations passes", async ({ page }) => {
    const dir = createTempDir();

    // Create baseline
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "stable",
      snapshotDir: dir,
    });

    // Same page again → passes
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "stable",
      snapshotDir: dir,
    });

    rmSync(dir, { recursive: true });
  });

  test("new violations cause failure", async ({ page }) => {
    const dir = createTempDir();

    // Baseline with accessible page (empty snapshot)
    await page.setContent(ACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "regression",
      snapshotDir: dir,
    });

    // Now introduce violations → should fail
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).not.toBeAccessible({
      snapshot: "regression",
      snapshotDir: dir,
    });

    rmSync(dir, { recursive: true });
  });

  test("ratchets down automatically", async ({ page }) => {
    const dir = createTempDir();

    // Create baseline with violations
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "ratchet",
      snapshotDir: dir,
    });

    const snapshotPath = join(dir, "ratchet.json");
    const initial: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    expect(initial.length).toBeGreaterThan(0);

    // Fix all violations → snapshot ratchets to empty
    await page.setContent(ACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "ratchet",
      snapshotDir: dir,
    });

    const ratcheted: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    expect(ratcheted).toHaveLength(0);

    rmSync(dir, { recursive: true });
  });

  test("adding more violations beyond baseline fails", async ({ page }) => {
    const dir = createTempDir();

    // Baseline with 2 violations (missing lang + missing alt)
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "more-violations",
      snapshotDir: dir,
    });

    // Add another img → new violation
    await page.setContent(EXTRA_VIOLATION_HTML);
    await expect(page).not.toBeAccessible({
      snapshot: "more-violations",
      snapshotDir: dir,
    });

    rmSync(dir, { recursive: true });
  });

  test("works with locator", async ({ page }) => {
    const dir = createTempDir();

    await page.setContent(SCOPED_HTML);
    await expect(page.locator("#good")).toBeAccessible({
      snapshot: "locator-good",
      snapshotDir: dir,
    });

    // Verify empty snapshot (no violations in #good)
    const snapshotPath = join(dir, "locator-good.json");
    const snapshot: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    expect(snapshot).toHaveLength(0);

    rmSync(dir, { recursive: true });
  });

  test("respects disabledRules", async ({ page }) => {
    const dir = createTempDir();

    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "disabled",
      snapshotDir: dir,
      disabledRules: ["accesslint-011"],
    });

    const snapshotPath = join(dir, "disabled.json");
    const snapshot: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    const ruleIds = snapshot.map((v) => v.ruleId);
    expect(ruleIds).not.toContain("accesslint-011");

    rmSync(dir, { recursive: true });
  });

  test("ACCESSLINT_UPDATE=1 forces snapshot update", async ({ page }) => {
    const dir = createTempDir();

    // Create empty baseline
    await page.setContent(ACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "env-update",
      snapshotDir: dir,
    });

    const orig = process.env.ACCESSLINT_UPDATE;
    process.env.ACCESSLINT_UPDATE = "1";
    try {
      // Now page has violations — would normally fail, but update mode passes
      await page.setContent(INACCESSIBLE_HTML);
      await expect(page).toBeAccessible({
        snapshot: "env-update",
        snapshotDir: dir,
      });

      // Verify snapshot was overwritten
      const snapshot: SnapshotViolation[] = JSON.parse(
        readFileSync(join(dir, "env-update.json"), "utf-8"),
      );
      expect(snapshot.length).toBeGreaterThan(0);
    } finally {
      if (orig === undefined) delete process.env.ACCESSLINT_UPDATE;
      else process.env.ACCESSLINT_UPDATE = orig;
    }

    rmSync(dir, { recursive: true });
  });

  test("selectors use Playwright locator format", async ({ page }) => {
    const dir = createTempDir();

    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).toBeAccessible({
      snapshot: "stable-selectors",
      snapshotDir: dir,
    });

    const snapshot: SnapshotViolation[] = JSON.parse(
      readFileSync(join(dir, "stable-selectors.json"), "utf-8"),
    );

    // Should use Playwright locator API style (getByRole, locator, etc.)
    // not raw CSS selectors
    const selectorTexts = snapshot.map((v) => v.selector);
    expect(selectorTexts.some((s) => s.includes("getByRole") || s.includes("locator("))).toBe(true);

    // Should not contain raw CSS class/ID selectors
    for (const v of snapshot) {
      expect(v.selector).not.toMatch(/[.#][a-z]/i);
    }

    rmSync(dir, { recursive: true });
  });

  test("stable selectors survive class-name changes", async ({ page }) => {
    const dir = createTempDir();

    // Page with a random-looking class name
    const htmlV1 = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>V1</title></head>
    <body>
      <main>
        <div class="abc123"><img src="test.png"></div>
        <h1>Hello</h1>
      </main>
    </body>
    </html>`;

    await page.setContent(htmlV1);
    await expect(page).toBeAccessible({
      snapshot: "class-change",
      snapshotDir: dir,
    });

    // Same structure, different class name
    const htmlV2 = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>V2</title></head>
    <body>
      <main>
        <div class="xyz789"><img src="test.png"></div>
        <h1>Hello</h1>
      </main>
    </body>
    </html>`;

    await page.setContent(htmlV2);
    await expect(page).toBeAccessible({
      snapshot: "class-change",
      snapshotDir: dir,
    });

    rmSync(dir, { recursive: true });
  });
});
