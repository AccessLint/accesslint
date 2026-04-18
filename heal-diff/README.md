# @accesslint/heal-diff

Multi-signal diff engine for baseline/current item sets. Given two lists of items and an ordered list of tiers, partition the union into `matched`, `healed`, `fixed`, `new`, and `likelyMoved`. Each tier names a subset of signal keys that must all match; matches at a heal-flagged tier land in `healed` alongside the replacement pair so callers can rewrite their baseline.

Independent of DOM, accessibility, or file formats. Built for [`@accesslint/jest`](../jest), [`@accesslint/vitest`](../vitest), and [`@accesslint/playwright`](../playwright) snapshot baselines, but applicable to any "identified set that drifts over time" problem (visual regression baselines, performance budgets, anywhere you want selector healing).

## Usage

```ts
import { diff, buildTier, type DiffItem } from "@accesslint/heal-diff";

type Sig = "selector" | "anchor" | "htmlFingerprint";

const baseline: DiffItem<Sig>[] = [
  { id: "img-alt", signals: { selector: "body > img", anchor: "data-testid=hero" } },
];
const current: DiffItem<Sig>[] = [
  { id: "img-alt", signals: { selector: "main > figure > img", anchor: "data-testid=hero" } },
];

const result = diff(baseline, current, [
  buildTier({ name: "exact", key: ["id", "selector"], heal: false }),
  buildTier({ name: "anchor", key: ["id", "anchor"], heal: true }),
]);

// result.healed[0] = { baseline, current, tier: "anchor" }
```

## API

- `diff(baseline, current, tiers, options?)` — main entry point.
- `buildTier({ name, key, heal, uniquenessGated? })` — small tier constructor.
- `normalizeHtml(html)` + `sha1Short(s)` — optional utilities for building HTML-fingerprint signals (import from `@accesslint/heal-diff/normalize`).

Each tier walks the remaining (unmatched) baseline and current items in tandem. Matching is count-based, so duplicate items are preserved. A tier with `heal: true` rewrites the baseline entry to the current-run item when it matches; a tier with `uniquenessGated: true` only matches when exactly one baseline candidate shares the tier key.

Unmatched current items that share two-or-more of `tag`, `htmlFingerprint`, or `relativeLocation` with any unmatched baseline item are returned as `likelyMoved` hints for downstream rendering. No pass/fail change.

## License

MIT
