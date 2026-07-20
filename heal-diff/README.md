# @accesslint/heal-diff

Multi-signal diff engine for baseline/current item sets. Given two lists of items and an ordered list of tiers, partition the union into `matched`, `healed`, `fixed`, `new`, and `likelyMoved`. Each tier names a subset of signal keys that must all match; matches at a heal-flagged tier land in `healed` alongside the replacement pair so callers can rewrite their baseline.

Independent of DOM, accessibility, file formats, and node builtins — every module is browser-safe and bundles into in-page scripts unchanged. Built for [`@accesslint/jest`](../jest), [`@accesslint/vitest`](../vitest), and [`@accesslint/playwright`](../playwright) snapshot baselines, but applicable to any "identified set that drifts over time" problem (visual regression baselines, performance budgets, anywhere you want selector healing).

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
- `buildTier({ name, key, heal, uniquenessGated?, verifiedBy? })` — small tier constructor.
- `normalizeHtml(html)` + `sha1Short(s)` — optional utilities for building HTML-fingerprint signals (import from `@accesslint/heal-diff/normalize`). `NORMALIZE_VERSION` identifies the normalization algorithm; fingerprints stored under an older version should be treated as cold. `isFingerprintableTag(tag)` names the elements whose snippets are page-scoped (`html`, `body`) and should not carry a fingerprint signal.

Each tier walks the remaining (unmatched) baseline and current items in tandem. Matching is count-based, so duplicate items are preserved. A tier with `heal: true` rewrites the baseline entry to the current-run item when it matches; a tier with `uniquenessGated: true` only matches when exactly one baseline candidate shares the tier key.

A tier with `verifiedBy: <signal>` refuses a candidate pair whose values for that signal both exist and disagree, releasing both items to later tiers (refuse-and-release). This catches impostors and swaps: two elements that exchanged addresses fail verification at the address tier and heal back to their true partners at a content tier. Either side lacking the signal leaves the match standing (missing-signal leniency), so signal-less baseline rows still match by the tier key alone.

Unmatched current items that share two-or-more of `tag`, `htmlFingerprint`, or `relativeLocation` with any unmatched baseline item are returned as `likelyMoved` hints for downstream rendering. No pass/fail change.

## License

MIT
