/**
 * Accesslint-specific signal extraction + tier configuration for
 * `@accesslint/heal-diff`.
 *
 * Signals captured per violation (beyond ruleId + selector) let the
 * matcher auto-heal baselines when a DOM refactor changes the selector
 * but the element is still the same, and emit a "likely moved" hint
 * when it can't heal confidently.
 */

import {
  extractAnchor as coreExtractAnchor,
  getAccessibleName,
  getComputedRole,
  getHtmlSnippet,
  getResilientLocator,
  buildRelativeLocation,
} from "@accesslint/core";
import type { Violation } from "@accesslint/core";
import { isFingerprintableTag, normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";
import { buildTier } from "@accesslint/heal-diff";
import type { DiffItem, Tier } from "@accesslint/heal-diff";

export type AccesslintSignal =
  | "selector"
  | "anchor"
  | "role"
  | "visualFingerprint"
  | "htmlFingerprint"
  | "relativeLocation"
  | "tag";

/**
 * Tier list used by accesslint's snapshot matcher. Order matters — the
 * diff engine picks the first tier whose key is fully populated on both
 * items.
 */
export function accesslintTiers(): Tier<AccesslintSignal>[] {
  return [
    buildTier<AccesslintSignal>({
      name: "exact",
      key: ["id", "selector"],
      heal: false,
      verifiedBy: "htmlFingerprint",
    }),
    buildTier<AccesslintSignal>({ name: "anchor", key: ["id", "anchor"], heal: true }),
    buildTier<AccesslintSignal>({ name: "role", key: ["id", "role"], heal: true }),
    buildTier<AccesslintSignal>({
      name: "visualFingerprint",
      key: ["id", "visualFingerprint"],
      heal: true,
    }),
    buildTier<AccesslintSignal>({
      name: "htmlFingerprint",
      key: ["id", "htmlFingerprint"],
      heal: true,
    }),
    buildTier<AccesslintSignal>({
      name: "relativeLocation",
      key: ["id", "relativeLocation", "tag"],
      heal: true,
      uniquenessGated: true,
    }),
  ];
}

export { buildRelativeLocation };

function roleSignal(el: Element): string | null {
  const role = getComputedRole(el);
  if (!role) return null;
  const name = getAccessibleName(el).trim();
  return name ? `${role}[name="${name}"]` : role;
}

/**
 * Adapt a live `Violation` into a `DiffItem` for the heal-diff engine.
 * The `payload` carries the full SnapshotViolation so we can recover
 * it after diffing.
 */
export function violationToDiffItem(v: Violation, payload: unknown): DiffItem<AccesslintSignal> {
  const signals: Partial<Record<AccesslintSignal, string>> = {};
  const el = v.element;

  signals.selector = el ? getResilientLocator(el) : v.selector;
  if (el) {
    const anchor = coreExtractAnchor(el);
    if (anchor) signals.anchor = anchor;
    const role = roleSignal(el);
    if (role) signals.role = role;
    const rel = buildRelativeLocation(el);
    if (rel) signals.relativeLocation = rel;
    signals.tag = el.tagName.toLowerCase();
  }

  const html = el ? getHtmlSnippet(el) : v.html;
  const tag = el?.tagName.toLowerCase();
  if (html && (!tag || isFingerprintableTag(tag))) {
    signals.htmlFingerprint = sha1Short(normalizeHtml(html));
  }

  return { id: v.ruleId, signals, payload };
}

/**
 * Build a DiffItem from an already-stored SnapshotViolation (no live
 * Element). Used when reading a baseline from disk.
 */
export function snapshotViolationToDiffItem(v: {
  ruleId: string;
  selector: string;
  anchor?: string;
  role?: string;
  visualFingerprint?: string;
  htmlFingerprint?: string;
  relativeLocation?: string;
  tag?: string;
}): DiffItem<AccesslintSignal> {
  const signals: Partial<Record<AccesslintSignal, string>> = { selector: v.selector };
  if (v.anchor) signals.anchor = v.anchor;
  if (v.role) signals.role = v.role;
  if (v.visualFingerprint) signals.visualFingerprint = v.visualFingerprint;
  if (v.htmlFingerprint) signals.htmlFingerprint = v.htmlFingerprint;
  if (v.relativeLocation) signals.relativeLocation = v.relativeLocation;
  if (v.tag) signals.tag = v.tag;
  return { id: v.ruleId, signals, payload: v };
}

export { coreExtractAnchor as extractAnchor };
