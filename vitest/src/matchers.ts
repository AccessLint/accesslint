/**
 * Custom Vitest matcher for accessibility assertions.
 *
 * Pure export — no side effects. Import from "@accesslint/vitest/matchers"
 * when you want to register manually with expect.extend().
 *
 * For auto-registration, import "@accesslint/vitest" instead.
 */
import type { Violation } from "@accesslint/core";
import {
  auditCacheKey,
  auditElement,
  formatViolation,
  resolvedAuditInput,
  runScopedAudit,
  sortByImpact,
  stableSelector,
} from "./audit";
import type { AccessibleMatcherOptions, SnapshotMatcherOptions } from "./audit";
import { getCachedAudit, isFixtureActive, setCachedAudit } from "./fixture";
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
  this: { isNot: boolean },
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
    const snap = evaluateSnapshot(current, snapshotPath, { update: isUpdateMode() });

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
          formatViolation(v, { locale: options?.locale, additionalRules: options?.additionalRules }),
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

function snapshotMessage(
  snap: SnapshotResult,
  name: string,
  current: SnapshotViolation[],
): string {
  if (snap.pass) {
    if (snap.created) {
      return (
        `Snapshot "${name}" created with ${current.length} baseline violation(s). ` +
        `Future runs fail only on new violations.`
      );
    }
    if (snap.updated) {
      return (
        `Snapshot "${name}" ratcheted — ${snap.fixedViolations.length} violation(s) ` +
        `fixed, ${current.length} remaining.`
      );
    }
    return `Matches snapshot "${name}" (${current.length} baseline violation(s)).`;
  }

  const summary = snap.newViolations.map((v) => `  ${v.ruleId}: ${v.selector}`).join("\n");
  return (
    `Expected no new accessibility violations beyond snapshot "${name}", ` +
    `but found ${snap.newViolations.length} new:\n\n${summary}`
  );
}

export const accesslintMatchers = { toBeAccessible };
