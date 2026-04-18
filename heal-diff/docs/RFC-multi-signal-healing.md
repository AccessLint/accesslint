# RFC: Multi-signal selector healing for accessibility snapshots

Status: implemented in this PR. Package: `@accesslint/heal-diff`. Consumers: `@accesslint/jest`, `@accesslint/vitest`, `@accesslint/playwright`.

## Problem

Snapshot baselines identify accessibility violations by `ruleId + selector`. Under jsdom / happy-dom the selector is a tag-path like `html > body > div:nth-of-type(2) > img`. Any DOM refactor (wrapping an element, reordering siblings, renaming an ancestor) breaks the selector even when the violation is unchanged. The matcher then reports it as one *fixed* baseline entry plus one *new* violation. Healing is automatic only when no new violation appears, and the developer pays a mental tax distinguishing "same issue, different selector" from "genuinely new issue". At scale a single shared-component change can ripple as N new violations across N snapshots with no indication they share a root cause.

## Non-goals

- LLM-based disambiguation. Deterministic first.
- Perfect tree-edit-distance recovery. Too expensive for the value.
- Cross-snapshot orchestration. Follow-up in `@accesslint/report`.

## Design patterns

### 1. Capture multiple selector signals, not one

Each violation is fingerprinted with a bag of orthogonal signals. No single signal is authoritative; each survives a different kind of change.

| Signal              | Survives...                                      | Cost to compute |
|---------------------|--------------------------------------------------|-----------------|
| `selector`          | nothing below — baseline assumption              | near zero       |
| `anchor`            | DOM restructure (as long as the attr stays)      | O(1) per elem   |
| `role`              | tag swap with same ARIA role + name              | O(depth) ARIA   |
| `visualFingerprint` | CSS + DOM churn that doesn't move pixels         | screenshot + hash |
| `htmlFingerprint`   | move, rename ancestors, attribute churn (class/style/id dropped) | O(200) hash |
| `relativeLocation`  | wrapper insertion, class churn                   | O(depth) walk   |

`anchor` uses the project's existing priority list (`data-testid` → `id` → `name` → `href` → `for` → `aria-label`). `role` joins `getComputedRole(el)` with `getAccessibleName(el)` to avoid two same-role elements collapsing. `htmlFingerprint` hashes a normalized HTML snippet (drop `class`/`style`/generated ids, lowercase tags, sort attributes, truncate text, SHA-1, keep 12 hex chars). `relativeLocation` walks to the nearest landmark ancestor and adds a short sibling-text anchor.

Capture happens once at snapshot time. Signals are JSON-serialized into `SnapshotViolation` alongside the selector. Missing signals degrade gracefully; tiers whose keys aren't fully populated skip the item.

### 2. Tiered matcher with count-based multiset semantics

The diff engine walks an ordered list of tiers. Each tier names a set of signal keys. A tier matches when every key is populated on both items and the concatenated value tuples are equal. Matches are count-based — two baseline + three current with the same anchor yields two heals and one new. Ties within a tier resolve deterministically (earliest baseline index).

Accesslint's tier list:

1. `exact` = `id, selector` — no heal, fast path.
2. `anchor` = `id, anchor` — heal.
3. `role` = `id, role` — heal.
4. `visualFingerprint` = `id, visualFingerprint` — heal (Playwright-only).
5. `htmlFingerprint` = `id, htmlFingerprint` — heal.
6. `relativeLocation` = `id, relativeLocation, tag` — heal, **uniqueness-gated**.

`uniquenessGated` means the tier only fires when exactly one baseline candidate remains at that key. It's the backstop for cases where many elements share a weak signal; ambiguity leaves the items alone for the weaker tiers below or the "likely moved" hint layer above.

### 3. Healing is loud but non-fatal

When tiers 2–6 match, the baseline entry is replaced in memory with the current-run item's full signal set, a `"healed"` record is appended to `.history.ndjson` with `{ tier, ruleId, oldSelector, newSelector }`, and the failure message prints one line per heal. The test still passes. Every heal is visible; none is silent. Healing + ratchet can happen in the same run.

### 4. "Likely moved" as a diagnostic, not a match

For violations that don't heal, a post-pass scans the unmatched sets and pairs any current with any baseline sharing two-or-more of `{tag, htmlFingerprint, relativeLocation}`. These are surfaced as `likelyMoved` metadata alongside the failure message, with the shared signal names and (where available) paths to baseline and current element screenshots. The developer reads one block and decides: same issue moved → `ACCESSLINT_UPDATE=1`; genuinely new → add a `data-testid`.

### 5. Keep screenshots, not just hashes

Playwright captures per-violation PNGs via `locator.screenshot()` with bounded concurrency (4 parallel) into `<baselineName>-screenshots/<ruleIdSlug>_<discriminator>.png`. Filenames follow the ecosystem convention (Playwright / jest-image-snapshot / Cypress): sibling directory, human-readable names, binary in git. Discriminator is the slugified anchor when present, else the first 8 hex of `htmlFingerprint`. Orphan PNGs are GC'd on save. The image is what makes the "likely moved" hint instantly decidable.

### 6. Grouping collapses root causes

The same shared component (e.g. a broken `Avatar`) often produces N violations with identical `htmlFingerprint`. `diff()` accepts a `grouping.by` config (defaults: `["anchor", "htmlFingerprint"]`) and exposes `newGroups`, `fixedGroups`, `likelyMovedGroups` on the result. Failure output renders one headline per group with a collapsed detail list, so "12 violations across 3 root causes" beats 12 separate error blocks. Cross-snapshot grouping is a follow-up in `@accesslint/report`.

### 7. Diff engine lives in its own package

`@accesslint/heal-diff` is DOM-free, accessibility-free, and I/O-free. Its inputs are `DiffItem<Sig>` tuples. This isolates the matcher semantics from the capture logic, lets `matchers-internal` wrap it with accesslint-specific tier configs and Violation adapters, and leaves the door open for reuse outside a11y (visual regression, performance budgets, anywhere you identify a drifting set).

## API sketch

```ts
// @accesslint/heal-diff
export function diff<Sig extends string>(
  baseline: DiffItem<Sig>[],
  current: DiffItem<Sig>[],
  tiers: Tier<Sig>[],
  options?: { grouping?: { by: readonly Sig[] } },
): DiffResult<Sig>;

// @accesslint/matchers-internal/snapshot
export function evaluateSnapshot(
  current: SnapshotViolation[],
  snapshotPath: string,
  options?: { update?: boolean; name?: string },
): SnapshotResult; // { pass, new, fixed, healed, likelyMoved, updated, created }
```

## Validation strategy

Cheapest first. The risk we bound is *silent false heal* (accepting a real regression as "same issue moved").

1. Synthetic fixture corpus: ~30 `(before, after, expected)` DOM pairs covering wrapper insertion, sibling reorder, ancestor rename, anchor swap, text change, genuine new. Unit-test level.
2. Property tests (fast-check): `htmlFingerprint` invariant under whitespace + attr-reorder, `relativeLocation` invariant under wrapper insertion, `extractAnchor` priority order.
3. Replay over existing `.history.ndjson`: reconstruct baselines at each historical transition and rerun the new matcher. `force-update` events are the high-signal corpus (a user overriding today usually means "selector changed, same issue").
4. Fork-benchmark on OSS a11y suites (shopify/polaris, adobe/spectrum-web-components, carbon): script refactors, measure per-tier heal rate and false-new rate.
5. Shadow-mode release: ship behind a flag alongside the current matcher, log divergences only, compute false-heal rate from logs before default-on.

## Tradeoffs

- **+40 bytes per violation** in the JSON baseline. Acceptable.
- **Screenshot PNGs in git** unless opted out. Matches ecosystem convention.
- **Tier 6 can false-heal** under exotic duplicates. Mitigated by uniqueness-gating.
- **Role and HTML fingerprint require live DOM access**. jsdom provides it; Playwright computes in-page via `AccessLint` IIFE globals.

## Open questions

- Visual fingerprint (`dHash` of screenshot bytes) is not yet matching — we store the PNG but skip the perceptual hash. Straightforward follow-up once an image-library decision is made.
- Cross-snapshot grouping (same shared component across `login`, `home`, `profile` snapshots) needs an orchestrator layer. Candidate home: `@accesslint/report`.
- LLM polish for `likelyMoved` disambiguation is explicitly out of scope this pass but sits cleanly on top of the deterministic signal data.
