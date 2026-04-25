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
  getSelector,
} from "@accesslint/core";
import type { Violation } from "@accesslint/core";
import { normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";
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
    buildTier<AccesslintSignal>({ name: "exact", key: ["id", "selector"], heal: false }),
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

// Section-level anchors for relativeLocation. Not a strict ARIA landmark set
// (fieldset/section don't map to landmark roles); chosen as stable semantic
// grouping tags that teams actually write and that survive refactors.
const LANDMARK_TAGS = new Set(["main", "nav", "header", "footer", "aside", "form"]);
const LANDMARK_ROLES = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "form",
  "main",
  "navigation",
  "region",
  "search",
]);

function isLandmark(el: Element): boolean {
  if (LANDMARK_TAGS.has(el.tagName.toLowerCase())) return true;
  const explicit = el.getAttribute("role");
  return explicit != null && LANDMARK_ROLES.has(explicit);
}

function segmentFor(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const role = el.getAttribute("role");
  if (role) return `${tag}[role=${role}]`;
  return tag;
}

const LANDMARK_WALK_LIMIT = 6;

/**
 * Produce a short, wrapper-invariant trail describing where an element
 * lives on the page. Combines:
 *
 * 1. The nearest landmark ancestor within {@link LANDMARK_WALK_LIMIT}
 *    ancestors. Pages with no nearby landmark return `null` so tier 6
 *    of the matcher is skipped (degrade gracefully; don't anchor to
 *    `<body>` on poorly-structured pages).
 * 2. An intermediate id- or role-bearing ancestor sitting between the
 *    element and that landmark, nearest to the element. This is what
 *    keeps the signal discriminating when the landmark itself is broad
 *    (e.g. a single `<main>` wrapping everything).
 * 3. The nearest sibling or ancestor sibling with short visible text,
 *    quoted. Anchors copy-stable location like `near "Email"` when no
 *    intermediate id/role exists.
 *
 * Example: `main > form#login > near "Email"`.
 */
export function buildRelativeLocation(el: Element): string | null {
  const between: Element[] = [];
  let current: Element | null = el.parentElement;
  let landmark: Element | null = null;
  for (let depth = 0; current && depth < LANDMARK_WALK_LIMIT; depth++) {
    if (isLandmark(current)) {
      landmark = current;
      break;
    }
    between.push(current);
    current = current.parentElement;
  }
  if (!landmark) return null;

  const trail: string[] = [segmentFor(landmark)];

  // Nearest-to-el id/role crumb inside the landmark. `between` is ordered
  // el-parent first, so the first hit is closest to the element.
  for (const ancestor of between) {
    if (ancestor.id || ancestor.getAttribute("role")) {
      trail.push(segmentFor(ancestor));
      break;
    }
  }

  const nearText = findNearestShortText(el);
  if (nearText) trail.push(`near "${nearText}"`);

  return trail.join(" > ");
}

function findNearestShortText(el: Element): string | null {
  let current: Element | null = el;
  for (let depth = 0; current && depth < 4; depth++, current = current.parentElement) {
    for (let i = 0; i < current.children.length; i++) {
      const sibling = current.children[i];
      if (sibling === el) continue;
      const text = (sibling.textContent ?? "").trim().replace(/\s+/g, " ");
      if (text.length > 0 && text.length <= 40) return text;
    }
  }
  return null;
}

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
export function violationToDiffItem(
  v: Violation,
  payload: unknown,
): DiffItem<AccesslintSignal> {
  const signals: Partial<Record<AccesslintSignal, string>> = {};
  const el = v.element;

  signals.selector = el ? getSelector(el) : v.selector;
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
  if (html) signals.htmlFingerprint = sha1Short(normalizeHtml(html));

  return { id: v.ruleId, signals, payload };
}

/**
 * Build a DiffItem from an already-stored SnapshotViolation (no live
 * Element). Used when reading a baseline from disk.
 */
export function snapshotViolationToDiffItem(
  v: {
    ruleId: string;
    selector: string;
    anchor?: string;
    role?: string;
    visualFingerprint?: string;
    htmlFingerprint?: string;
    relativeLocation?: string;
    tag?: string;
  },
): DiffItem<AccesslintSignal> {
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
