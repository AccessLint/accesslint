import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentType } from "react";
import { createElement } from "react";
import { audit } from "../../src/lib/state.js";
import type { ViolationFingerprint } from "./types.js";

export function renderComponent(Component: ComponentType): string {
  return renderToStaticMarkup(createElement(Component));
}

export function extractFingerprints(html: string): ViolationFingerprint[] {
  const result = audit(html, { componentMode: true });
  return result.violations.map((v) => ({
    ruleId: v.ruleId,
    impact: v.impact,
  }));
}

/**
 * Compare two violation sets using multiset matching on (ruleId, impact) tuples.
 * Returns matched, missing (in ground truth but not Claude), and extra (in Claude but not ground truth).
 */
export function compareViolationSets(
  groundTruth: ViolationFingerprint[],
  claude: ViolationFingerprint[]
): { matched: number; missing: number; extra: number } {
  const toKey = (v: ViolationFingerprint) => `${v.ruleId}|${v.impact}`;

  // Build multiset from ground truth
  const gtCounts = new Map<string, number>();
  for (const v of groundTruth) {
    const key = toKey(v);
    gtCounts.set(key, (gtCounts.get(key) ?? 0) + 1);
  }

  // Build multiset from Claude
  const claudeCounts = new Map<string, number>();
  for (const v of claude) {
    const key = toKey(v);
    claudeCounts.set(key, (claudeCounts.get(key) ?? 0) + 1);
  }

  // Compute matched = sum of min(gt, claude) per key
  let matched = 0;
  const allKeys = new Set([...gtCounts.keys(), ...claudeCounts.keys()]);
  for (const key of allKeys) {
    const gtCount = gtCounts.get(key) ?? 0;
    const claudeCount = claudeCounts.get(key) ?? 0;
    matched += Math.min(gtCount, claudeCount);
  }

  const missing = groundTruth.length - matched;
  const extra = claude.length - matched;

  return { matched, missing, extra };
}
