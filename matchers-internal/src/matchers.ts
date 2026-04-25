/**
 * Runner-agnostic `toBeAccessible()` matcher. Returns `{ pass, message }`, the
 * shape both Jest's and Vitest's `expect.extend` accept. Consumer packages
 * (@accesslint/vitest, @accesslint/jest) wire it into their respective runners.
 */
import type { Violation } from "@accesslint/core";
import {
  auditCacheKey,
  auditElement,
  formatViolation,
  resolvedAuditInput,
  runScopedAudit,
  sortByImpact,
} from "./audit";
import type { AccessibleMatcherOptions, SnapshotMatcherOptions } from "./audit";
import { getCachedAudit, isFixtureActive, setCachedAudit } from "./cache";
import {
  evaluateSnapshot,
  isUpdateMode,
  resolveSnapshotPath,
  toSnapshotViolations,
  validateSnapshotName,
} from "./snapshot";
import type { SnapshotResult, SnapshotViolation } from "./snapshot";

export type { AccessibleMatcherOptions, SnapshotMatcherOptions } from "./audit";

export const toBeAccessible = function (
  this: { isNot?: boolean },
  received: Element,
  options?: SnapshotMatcherOptions,
) {
  if (!(received instanceof Element)) {
    return {
      pass: false,
      message: () =>
        "toBeAccessible() expects an Element (e.g. canvasElement), " +
        `but received ${typeof received}`,
    };
  }

  // ── Snapshot mode ─────────────────────────────────────────────────────
  if (options?.snapshot !== undefined) {
    validateSnapshotName(options.snapshot);
    const violations = getOrAudit(received, options);
    const snapshotPath = resolveSnapshotPath(options.snapshot, options.snapshotDir);
    const current = toSnapshotViolations(violations);
    const snap = evaluateSnapshot(current, snapshotPath, {
      update: isUpdateMode(),
      name: options.snapshot,
    });

    return {
      pass: snap.pass,
      message: () => snapshotMessage(snap, options.snapshot as string, current),
    };
  }

  // ── Standard mode ─────────────────────────────────────────────────────
  const violations = getOrAudit(received, options);
  const pass = violations.length === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return "Expected element to have accessibility violations, but none were found";
      }
      const summary = sortByImpact(violations)
        .map((v) =>
          formatViolation(v, {
            locale: options?.locale,
            additionalRules: options?.additionalRules,
          }),
        )
        .join("\n\n");
      return (
        `Expected element to have no accessibility violations, ` +
        `but found ${violations.length}:\n\n${summary}`
      );
    },
  };
};

/**
 * Return the scoped violations for `el`, reusing a cached audit when the
 * fixture is active and the option set matches.
 */
function getOrAudit(el: Element, options?: AccessibleMatcherOptions): Violation[] {
  const input = resolvedAuditInput(el, options);
  if (!input) return [];

  const useCache = isFixtureActive(input.doc);
  if (!useCache) {
    return auditElement(el, options);
  }

  const key = auditCacheKey(input);
  let all = getCachedAudit(input.doc, key);
  if (!all) {
    all = runScopedAudit(input);
    setCachedAudit(input.doc, key, all);
  }
  return auditElement(el, options, all);
}

function snapshotMessage(snap: SnapshotResult, name: string, current: SnapshotViolation[]): string {
  if (snap.pass) {
    const parts: string[] = [];

    if (snap.created) {
      parts.push(
        `Snapshot "${name}" created with ${current.length} baseline violation(s). ` +
          `Future runs fail only on new violations.`,
      );
    } else if (snap.updated) {
      const reasons: string[] = [];
      if (snap.fixedViolations.length > 0) reasons.push(`${snap.fixedViolations.length} fixed`);
      if (snap.healed.length > 0) reasons.push(`${snap.healed.length} healed`);
      if (snap.refreshed.length > 0) reasons.push(`${snap.refreshed.length} refreshed`);
      const verb =
        snap.fixedViolations.length > 0
          ? "ratcheted"
          : snap.healed.length > 0
            ? "updated"
            : "refreshed";
      parts.push(
        `Snapshot "${name}" ${verb} (${reasons.join(", ")}); ${current.length} remaining.`,
      );
    } else {
      parts.push(`Matches snapshot "${name}" (${current.length} baseline violation(s)).`);
    }

    for (const h of snap.healed) {
      parts.push(
        `  healed ${h.ruleId} via ${h.tier}: ${h.oldSelector} -> ${h.newSelector}`,
      );
    }

    return parts.join("\n");
  }

  const lines: string[] = [];
  lines.push(
    `Expected no new accessibility violations beyond snapshot "${name}", ` +
      `but found ${snap.newViolations.length} new:`,
  );
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
}

export const accesslintMatchers = { toBeAccessible };
