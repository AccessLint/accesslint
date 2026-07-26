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
// `historyPathFor` isn't re-exported by ./snapshot; matchers-internal is a
// devDependency, so read the sidecar path from the source of truth.
import { historyPathFor } from "@accesslint/matchers-internal/snapshot";
import type { HistoryRecord } from "@accesslint/matchers-internal/snapshot";
import { toBeAccessible } from "./matchers";

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

function readHistory(snapshotPath: string): HistoryRecord[] {
  const path = historyPathFor(snapshotPath);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as HistoryRecord);
}

function healEvents(snapshotPath: string): HistoryRecord[] {
  return readHistory(snapshotPath).filter((r) => r.event === "healed");
}

function requireBaseline(snapshotPath: string): SnapshotViolation[] {
  const baseline = loadSnapshot(snapshotPath);
  expect(baseline).not.toBeNull();
  return baseline!;
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
      { ruleId: "readable/html-has-lang", selector: "html" },
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ];

    saveSnapshot(path, violations);
    const loaded = loadSnapshot(path);

    expect(loaded).toEqual([
      { ruleId: "readable/html-has-lang", selector: "html" },
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
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
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ];
    const { newViolations, fixedViolations } = compareViolations(v, v);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(0);
  });

  test("detects new violations", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
      { ruleId: "readable/html-has-lang", selector: "html" },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(newViolations[0].ruleId).toBe("readable/html-has-lang");
    expect(fixedViolations).toHaveLength(0);
  });

  test("detects fixed violations", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
      { ruleId: "readable/html-has-lang", selector: "html" },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(1);
    expect(fixedViolations[0].ruleId).toBe("readable/html-has-lang");
  });

  test("detects both new and fixed", () => {
    const baseline: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ];
    const current: SnapshotViolation[] = [{ ruleId: "readable/html-has-lang", selector: "html" }];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(fixedViolations).toHaveLength(1);
  });

  test("handles duplicate selectors — added", () => {
    const sel = "getByRole('img')";
    const baseline: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
    ];
    const current: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
    ];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(1);
    expect(fixedViolations).toHaveLength(0);
  });

  test("handles duplicate selectors — removed", () => {
    const sel = "getByRole('img')";
    const baseline: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
    ];
    const current: SnapshotViolation[] = [{ ruleId: "text-alternatives/img-alt", selector: sel }];

    const { newViolations, fixedViolations } = compareViolations(current, baseline);
    expect(newViolations).toHaveLength(0);
    expect(fixedViolations).toHaveLength(2);
  });

  test("handles duplicate selectors — unchanged count", () => {
    const sel = "getByRole('img')";
    const violations: SnapshotViolation[] = [
      { ruleId: "text-alternatives/img-alt", selector: sel },
      { ruleId: "text-alternatives/img-alt", selector: sel },
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
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
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
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
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

    saveSnapshot(path, [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ]);

    const result = evaluateSnapshot(
      [
        { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
        { ruleId: "readable/html-has-lang", selector: "html" },
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
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
      { ruleId: "readable/html-has-lang", selector: "html" },
    ]);

    const result = evaluateSnapshot(
      [{ ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" }],
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

    saveSnapshot(path, [
      { ruleId: "text-alternatives/img-alt", selector: "html > body > main > img" },
    ]);

    const result = evaluateSnapshot(
      [{ ruleId: "readable/html-has-lang", selector: "html" }],
      path,
      {
        update: true,
      },
    );

    expect(result.pass).toBe(true);
    expect(result.updated).toBe(true);

    const updated = loadSnapshot(path);
    expect(updated).toEqual([{ ruleId: "readable/html-has-lang", selector: "html" }]);

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
      disabledRules: ["text-alternatives/img-alt"],
    });

    const snapshotPath = join(dir, "disabled.json");
    const snapshot: SnapshotViolation[] = JSON.parse(readFileSync(snapshotPath, "utf-8"));
    const ruleIds = snapshot.map((v) => v.ruleId);
    expect(ruleIds).not.toContain("text-alternatives/img-alt");

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

// ── Healing end-to-end (real Chromium: audit → signal capture → tiered diff) ──
//
// Implements RFC validation item 1 (heal-diff/docs/RFC-multi-signal-healing.md,
// "synthetic fixture corpus") at the browser level. Every fixture below was
// confirmed with a throwaway probe that printed the captured
// SnapshotViolation[] for both versions; the recorded facts are what each
// assertion depends on.
//
// The hard part is making the stable selector actually differ: `normalize()`
// is designed to survive refactors, so a naive before/after pair exact-matches
// at T1 and never exercises healing. Notably `data-testid` is *also*
// Playwright's testIdAttribute, so an anchored element normalizes to
// `getByTestId(...)` — position-independent, always T1. The fixtures use
// `data-id` (an accesslint anchor attr Playwright ignores) plus duplicate
// same-role/same-text siblings, which forces positional disambiguation.

/**
 * T2 fixture. Violating `<img data-id="hero">` beside a NON-violating named
 * look-alike, so exactly one violation. Probe-confirmed: `getByRole('img')`
 * matches both images, so normalize disambiguates positionally
 * (`.first()` → `.nth(1)` after the reorder) while `data-id=hero` survives.
 */
const ANCHOR_HEAL_BEFORE = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Gallery</title></head>
<body>
  <main>
    <h1>Gallery</h1>
    <img data-id="hero" src="hero.png">
    <img src="team.png" alt="Team photo">
  </main>
</body>
</html>`;

const ANCHOR_HEAL_AFTER = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Gallery</title></head>
<body>
  <main>
    <h1>Gallery</h1>
    <img src="team.png" alt="Team photo">
    <img data-id="hero" src="hero.png">
  </main>
</body>
</html>`;

/**
 * T5 fixture. `<div tabindex="1">` is role-less, so the role tier (which sits
 * above htmlFingerprint and would otherwise shadow it) is skipped on both
 * sides; the div carries no anchor attribute either. Probe-confirmed: the
 * identical-text twin makes normalize emit `getByText('Widget').nth(1)` →
 * `.nth(2)` after the reorder ("Widgets" in the `<h1>` is index 0), while the
 * violating div's own outerHTML — and therefore its htmlFingerprint — is
 * byte-identical across both versions.
 */
const FINGERPRINT_HEAL_BEFORE = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <div tabindex="1">Widget</div>
    <div>Widget</div>
  </main>
</body>
</html>`;

const FINGERPRINT_HEAL_AFTER = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <div>Widget</div>
    <div tabindex="1">Widget</div>
  </main>
</body>
</html>`;

/**
 * T6 fixture. Two role-less, anchor-less, same-tag violations directly under
 * `<main>`. Probe-confirmed: both share `relativeLocation` = `main > near
 * "Widgets"` and `tag` = `div` in both versions, and the refactor changes
 * BOTH elements' text, so all four htmlFingerprints are distinct. Every
 * stronger tier therefore misses and the relativeLocation bucket holds 2
 * baseline candidates, which the uniqueness gate refuses.
 */
const AMBIGUOUS_BEFORE = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <div tabindex="1">Alpha</div>
    <div tabindex="2">Beta</div>
  </main>
</body>
</html>`;

const AMBIGUOUS_AFTER = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <section><div tabindex="1">Alpha renamed</div></section>
    <section><div tabindex="2">Beta renamed</div></section>
  </main>
</body>
</html>`;

/**
 * Negative-control fixture. Probe-confirmed: the kept violation normalizes to
 * `getByText('Alpha')` in both versions, so it T1-matches and leaves no
 * unmatched baseline entry for a weaker tier to hand to the newcomer.
 */
const NEW_VIOLATION_BEFORE = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <div tabindex="1">Alpha</div>
  </main>
</body>
</html>`;

const NEW_VIOLATION_AFTER = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Widgets</title></head>
<body>
  <main>
    <h1>Widgets</h1>
    <div tabindex="1">Alpha</div>
    <div tabindex="3">Gamma</div>
  </main>
</body>
</html>`;

test.describe("toBeAccessible with snapshot — healing (e2e)", () => {
  test("heals at the anchor tier when the stable selector moves", async ({ page }) => {
    const dir = createTempDir();
    const snapshotPath = join(dir, "anchor-heal.json");

    try {
      await page.setContent(ANCHOR_HEAL_BEFORE);
      await expect(page).toBeAccessible({
        snapshot: "anchor-heal",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      const baseline = requireBaseline(snapshotPath);
      expect(baseline).toHaveLength(1);
      expect(baseline[0].ruleId).toBe("text-alternatives/img-alt");
      expect(baseline[0].selector).toBe("getByRole('img').first()");
      expect(baseline[0].anchor).toBe("data-id=hero");
      // In-browser captureMainFrameSignals produced a real fingerprint.
      expect(baseline[0].htmlFingerprint).toMatch(/^[0-9a-f]{12}$/);

      await page.setContent(ANCHOR_HEAL_AFTER);
      await expect(page).toBeAccessible({
        snapshot: "anchor-heal",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      const healed = requireBaseline(snapshotPath);
      expect(healed).toHaveLength(1);
      expect(healed[0].selector).toBe("getByRole('img').nth(1)");
      expect(healed[0].anchor).toBe("data-id=hero");

      const heals = healEvents(snapshotPath);
      expect(heals).toHaveLength(1);
      expect(heals[0].healedTier).toBe("anchor");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("heals at the htmlFingerprint tier when no anchor or role is available", async ({
    page,
  }) => {
    const dir = createTempDir();
    const snapshotPath = join(dir, "fingerprint-heal.json");

    try {
      await page.setContent(FINGERPRINT_HEAL_BEFORE);
      await expect(page).toBeAccessible({
        snapshot: "fingerprint-heal",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      const baseline = requireBaseline(snapshotPath);
      expect(baseline).toHaveLength(1);
      expect(baseline[0].ruleId).toBe("keyboard-accessible/tabindex");
      expect(baseline[0].selector).toBe("getByText('Widget').nth(1)");
      // The tiers above htmlFingerprint have nothing to key on.
      expect(baseline[0].anchor).toBeUndefined();
      expect(baseline[0].role).toBeUndefined();
      const fingerprint = baseline[0].htmlFingerprint;
      expect(fingerprint).toMatch(/^[0-9a-f]{12}$/);

      await page.setContent(FINGERPRINT_HEAL_AFTER);
      await expect(page).toBeAccessible({
        snapshot: "fingerprint-heal",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      const healed = requireBaseline(snapshotPath);
      expect(healed).toHaveLength(1);
      expect(healed[0].selector).toBe("getByText('Widget').nth(2)");
      expect(healed[0].htmlFingerprint).toBe(fingerprint);

      const heals = healEvents(snapshotPath);
      expect(heals).toHaveLength(1);
      expect(heals[0].healedTier).toBe("htmlFingerprint");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("uniqueness gate refuses to heal two ambiguous look-alikes", async ({ page }) => {
    const dir = createTempDir();
    const snapshotPath = join(dir, "ambiguous.json");

    try {
      await page.setContent(AMBIGUOUS_BEFORE);
      await expect(page).toBeAccessible({
        snapshot: "ambiguous",
        snapshotDir: dir,
        visualSnapshots: false,
      });
      expect(requireBaseline(snapshotPath)).toHaveLength(2);

      await page.setContent(AMBIGUOUS_AFTER);
      const result = await toBeAccessible(page, {
        snapshot: "ambiguous",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      expect(result.pass).toBe(false);
      const message = result.message();
      expect(message).toContain("found 2 new");
      expect(message).toContain("likely moved from:");
      expect(message).toContain("matched on: tag, relativeLocation");

      expect(healEvents(snapshotPath)).toHaveLength(0);

      // Failing run leaves the baseline untouched.
      const after = requireBaseline(snapshotPath);
      expect(after.map((v) => v.selector).sort()).toEqual([
        "getByText('Alpha')",
        "getByText('Beta')",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a genuinely new violation is reported, never healed", async ({ page }) => {
    const dir = createTempDir();
    const snapshotPath = join(dir, "new-violation.json");

    try {
      await page.setContent(NEW_VIOLATION_BEFORE);
      await expect(page).toBeAccessible({
        snapshot: "new-violation",
        snapshotDir: dir,
        visualSnapshots: false,
      });
      expect(requireBaseline(snapshotPath)).toHaveLength(1);

      await page.setContent(NEW_VIOLATION_AFTER);
      const result = await toBeAccessible(page, {
        snapshot: "new-violation",
        snapshotDir: dir,
        visualSnapshots: false,
      });

      expect(result.pass).toBe(false);
      const message = result.message();
      expect(message).toContain("found 1 new");
      expect(message).toContain("getByText('Gamma')");
      expect(message).not.toContain("getByText('Alpha')");

      expect(healEvents(snapshotPath)).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
