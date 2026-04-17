/**
 * Custom Playwright matcher for accessibility assertions.
 *
 * Pure export — no side effects. Import from "@accesslint/playwright/matchers"
 * when you want to register manually with expect.extend().
 *
 * For auto-registration, import "@accesslint/playwright" instead.
 */
import { createRequire } from "node:module";
import type { Page, Locator } from "@playwright/test";
import { accesslintAudit, formatViolation } from "./audit";
import type { AccessibleMatcherOptions } from "./audit";
import {
  validateSnapshotName,
  resolveSnapshotPath,
  evaluateSnapshot,
  waitForPageSettle,
  toStableViolations,
} from "./snapshot";

export type { AccessibleMatcherOptions } from "./audit";

export interface SnapshotMatcherOptions extends AccessibleMatcherOptions {
  /** Name for the snapshot file (e.g. "homepage"). */
  snapshot?: string;
  /** Directory to store snapshot files. Defaults to `{cwd}/accessibility-snapshots/`. */
  snapshotDir?: string;
}

const require = createRequire(import.meta.url);

/**
 * Detect whether snapshots should be force-updated.
 *
 * Triggers:
 * - `ACCESSLINT_UPDATE=1` environment variable
 * - `playwright test -u` (`--update-snapshots`) CLI flag
 */
function isUpdateMode(): boolean {
  if (process.env.ACCESSLINT_UPDATE === "1") return true;

  try {
    const pw = require("@playwright/test");
    const updateSnapshots = pw.test.info().config.updateSnapshots;
    return updateSnapshots === "all" || updateSnapshots === "changed";
  } catch {
    return false;
  }
}

export async function toBeAccessible(target: Page | Locator, options?: SnapshotMatcherOptions) {
  // ── Snapshot mode ────────────────────────────────────────────────────
  if (options?.snapshot) {
    validateSnapshotName(options.snapshot);

    // Wait for the page to settle so the audit captures a stable state
    await waitForPageSettle(target);

    const result = await accesslintAudit(target, options);
    const snapshotPath = resolveSnapshotPath(options.snapshot, options.snapshotDir);
    const stableViolations = await toStableViolations(target, result.violations);
    const update = isUpdateMode();
    const snap = evaluateSnapshot(stableViolations, snapshotPath, { update });

    return {
      pass: snap.pass,
      name: "toBeAccessible",
      message: () => {
        if (snap.pass) {
          if (snap.created) {
            return (
              `Snapshot "${options.snapshot}" created with ` +
              `${stableViolations.length} baseline violation(s)`
            );
          }
          if (snap.updated) {
            return `Snapshot "${options.snapshot}" updated`;
          }
          return "Expected accessibility violations beyond snapshot, but none were found";
        }

        const summary = snap.newViolations.map((v) => `  ${v.ruleId}: ${v.selector}`).join("\n");
        return (
          `Expected no new accessibility violations beyond snapshot ` +
          `"${options.snapshot}", but found ${snap.newViolations.length} new:\n\n${summary}`
        );
      },
    };
  }

  // ── Standard mode (no snapshot) ──────────────────────────────────────
  const result = await accesslintAudit(target, options);
  const pass = result.violations.length === 0;

  return {
    pass,
    name: "toBeAccessible",
    message: () => {
      if (pass) {
        return "Expected accessibility violations, but none were found";
      }
      const summary = result.violations.map(formatViolation).join("\n\n");
      return (
        `Expected no accessibility violations, ` +
        `but found ${result.violations.length}:\n\n${summary}`
      );
    },
  };
}

export const accesslintMatchers = { toBeAccessible };
