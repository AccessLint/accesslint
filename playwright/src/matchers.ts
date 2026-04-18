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
  /**
   * Capture per-violation PNG screenshots alongside the baseline so the
   * "likely moved" failure hint can show visual context. Defaults to true.
   */
  visualSnapshots?: boolean;
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
    const stableViolations = await toStableViolations(target, result.violations, {
      snapshotPath,
      visualSnapshots: options.visualSnapshots,
    });
    const update = isUpdateMode();
    const snap = evaluateSnapshot(stableViolations, snapshotPath, {
      update,
      name: options.snapshot,
    });

    return {
      pass: snap.pass,
      name: "toBeAccessible",
      message: () => {
        if (snap.pass) {
          const parts: string[] = [];
          if (snap.created) {
            parts.push(
              `Snapshot "${options.snapshot}" created with ` +
                `${stableViolations.length} baseline violation(s)`,
            );
          } else if (snap.updated) {
            const reasons: string[] = [];
            if (snap.fixedViolations.length > 0)
              reasons.push(`${snap.fixedViolations.length} fixed`);
            if (snap.healed.length > 0) reasons.push(`${snap.healed.length} healed`);
            const verb = snap.fixedViolations.length > 0 ? "ratcheted" : "updated";
            parts.push(`Snapshot "${options.snapshot}" ${verb} (${reasons.join(", ")})`);
          } else {
            parts.push("Expected accessibility violations beyond snapshot, but none were found");
          }
          for (const h of snap.healed) {
            parts.push(`  healed ${h.ruleId} via ${h.tier}: ${h.oldSelector} -> ${h.newSelector}`);
          }
          return parts.join("\n");
        }

        const lines: string[] = [
          `Expected no new accessibility violations beyond snapshot ` +
            `"${options.snapshot}", but found ${snap.newViolations.length} new:`,
        ];
        for (const v of snap.newViolations) {
          lines.push(`  ${v.ruleId}: ${v.selector}`);
          const hint = snap.likelyMoved.find((lm) => lm.current.selector === v.selector);
          if (hint) {
            lines.push(`    likely moved from: ${hint.candidate.selector}`);
            lines.push(`    matched on: ${hint.sharedSignals.join(", ")}`);
            if (v.screenshotPath && hint.candidate.screenshotPath) {
              lines.push(`    baseline screenshot: ${hint.candidate.screenshotPath}`);
              lines.push(`    current screenshot:  ${v.screenshotPath}`);
            }
            lines.push(`    if same: run with ACCESSLINT_UPDATE=1`);
            lines.push(`    if new: add a data-testid to disambiguate`);
          }
        }
        return lines.join("\n");
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
