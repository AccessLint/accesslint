/**
 * Tiered multi-signal diff engine.
 *
 * Given two item sets (baseline, current) and an ordered list of tiers,
 * produce a DiffResult that partitions the union into matched / healed /
 * fixed / new / likelyMoved. Matching is count-based, so duplicate items
 * are preserved. Each tier names a subset of signal keys that all must
 * match; matches at a non-T1 heal tier land in `healed` and carry the
 * replacement pair.
 *
 * A tier with `verifiedBy` can refuse a candidate pair, and refusals are
 * remembered for the rest of the run so a weaker tier cannot re-pair the
 * same two items unverified. Unresolved refusals surface in `refused`.
 */

export type TierKey<Sig extends string> = "id" | Sig;

export interface DiffItem<Sig extends string = string> {
  id: string;
  signals: Partial<Record<Sig, string>>;
  payload?: unknown;
}

export interface Tier<Sig extends string = string> {
  name: string;
  key: readonly TierKey<Sig>[];
  heal: boolean;
  /** Only match when exactly one baseline candidate remains at this tier. */
  uniquenessGated?: boolean;
  /**
   * Verification signal for candidate pairs at this tier. A pair whose
   * verification values both exist and disagree is refused, and both items
   * are released to later tiers (refuse-and-release). Either side lacking
   * the signal leaves the match standing (missing-signal leniency), so
   * signal-less baseline rows still match by the tier key alone.
   *
   * A refusal is remembered for the rest of the run: it means "these two are
   * not the same element", which stays true at every weaker tier, so the pair
   * can never re-match further down. Each item is still free to match anyone
   * else, which is what keeps swapped elements healing to their true partners.
   */
  verifiedBy?: Sig;
}

export interface MatchedPair<Sig extends string> {
  baseline: DiffItem<Sig>;
  current: DiffItem<Sig>;
  tier: string;
}

export type HealedPair<Sig extends string> = MatchedPair<Sig>;

/**
 * A candidate pair a verified tier refused: both items carried the tier's
 * verification signal and the values disagreed. Reported only when the
 * current item ends the run unmatched, since that is the case a caller has
 * to explain to a developer.
 */
export interface RefusedPair<Sig extends string> {
  baseline: DiffItem<Sig>;
  current: DiffItem<Sig>;
  /** Tier that refused — the tier at which the two items met. */
  tier: string;
  /** Signal whose values disagreed. */
  signal: Sig;
}

export interface LikelyMoved<Sig extends string> {
  current: DiffItem<Sig>;
  candidate: DiffItem<Sig>;
  sharedSignals: string[];
}

export interface Group<Sig extends string> {
  key: string;
  signals: Partial<Record<Sig, string>>;
  count: number;
  items: DiffItem<Sig>[];
}

export interface GroupingConfig<Sig extends string> {
  by: readonly Sig[];
}

export interface DiffOptions<Sig extends string> {
  grouping?: GroupingConfig<Sig>;
}

export interface DiffResult<Sig extends string> {
  matched: MatchedPair<Sig>[];
  healed: HealedPair<Sig>[];
  fixed: DiffItem<Sig>[];
  new: DiffItem<Sig>[];
  likelyMoved: LikelyMoved<Sig>[];
  refused: RefusedPair<Sig>[];
  newGroups?: Group<Sig>[];
  fixedGroups?: Group<Sig>[];
  likelyMovedGroups?: Group<Sig>[];
}

const NULL = "\u0000";

function keyOf<Sig extends string>(item: DiffItem<Sig>, tier: Tier<Sig>): string | null {
  const parts: string[] = [];
  for (const k of tier.key) {
    const v = k === "id" ? item.id : item.signals[k as Sig];
    if (v == null || v === "") return null;
    parts.push(v);
  }
  return parts.join(NULL);
}

function verificationPasses<Sig extends string>(
  a: DiffItem<Sig>,
  b: DiffItem<Sig>,
  signal: Sig | undefined,
): boolean {
  if (signal == null) return true;
  const av = a.signals[signal];
  const bv = b.signals[signal];
  if (av == null || av === "" || bv == null || bv === "") return true;
  return av === bv;
}

/**
 * Refusals recorded so far, keyed on object identity (current -> baseline).
 * Identity, not signal values: `diff()` keeps the caller's `DiffItem`
 * references throughout the tier loop and matching is count-based, so two
 * items with identical signals are still distinct items. Value-keying would
 * refuse both when only one was refused.
 */
type RefusalMemory<Sig extends string> = Map<DiffItem<Sig>, Map<DiffItem<Sig>, RefusedPair<Sig>>>;

function recordRefusal<Sig extends string>(
  memory: RefusalMemory<Sig>,
  pair: RefusedPair<Sig>,
): void {
  let perCurrent = memory.get(pair.current);
  if (!perCurrent) {
    perCurrent = new Map();
    memory.set(pair.current, perCurrent);
  }
  if (!perCurrent.has(pair.baseline)) perCurrent.set(pair.baseline, pair);
}

function isRefused<Sig extends string>(
  memory: RefusalMemory<Sig>,
  curr: DiffItem<Sig>,
  baseline: DiffItem<Sig>,
): boolean {
  return memory.get(curr)?.has(baseline) ?? false;
}

/**
 * Take the first bucket candidate that neither carries a standing refusal
 * with `curr` nor fails this tier's verification. Candidates rejected on
 * verification are remembered so no weaker tier re-pairs them.
 *
 * The uniqueness gate counts raw `bucket.length`, refusals included, so a
 * refusal can only ever subtract a heal, never create one.
 */
function consumeFromBucket<Sig extends string>(
  bucket: DiffItem<Sig>[] | undefined,
  tier: Tier<Sig>,
  curr: DiffItem<Sig>,
  memory: RefusalMemory<Sig>,
): DiffItem<Sig> | null {
  if (!bucket || bucket.length === 0) return null;
  if ((tier.uniquenessGated ?? false) && bucket.length > 1) return null;
  for (let i = 0; i < bucket.length; i++) {
    const cand = bucket[i];
    if (isRefused(memory, curr, cand)) continue;
    if (!verificationPasses(curr, cand, tier.verifiedBy)) {
      recordRefusal(memory, {
        baseline: cand,
        current: curr,
        tier: tier.name,
        signal: tier.verifiedBy as Sig,
      });
      continue;
    }
    return bucket.splice(i, 1)[0];
  }
  return null;
}

function bucketize<Sig extends string>(
  items: DiffItem<Sig>[],
  tier: Tier<Sig>,
): Map<string, DiffItem<Sig>[]> {
  const buckets = new Map<string, DiffItem<Sig>[]>();
  for (const item of items) {
    const k = keyOf(item, tier);
    if (k == null) continue;
    let bucket = buckets.get(k);
    if (!bucket) {
      bucket = [];
      buckets.set(k, bucket);
    }
    bucket.push(item);
  }
  return buckets;
}

/**
 * Partition baseline/current into matched/healed/fixed/new/likelyMoved using
 * an ordered list of tiers. T1 (no heal) is treated the same as any other
 * tier here — callers decide semantics via `Tier.heal`.
 */
export function diff<Sig extends string>(
  baseline: DiffItem<Sig>[],
  current: DiffItem<Sig>[],
  tiers: readonly Tier<Sig>[],
  options?: DiffOptions<Sig>,
): DiffResult<Sig> {
  const baselineRemaining = [...baseline];
  const currentRemaining = [...current];
  const matched: MatchedPair<Sig>[] = [];
  const healed: HealedPair<Sig>[] = [];
  const refusals: RefusalMemory<Sig> = new Map();

  for (const tier of tiers) {
    if (currentRemaining.length === 0 || baselineRemaining.length === 0) break;

    const baselineBuckets = bucketize(baselineRemaining, tier);
    const stillUnmatchedCurrent: DiffItem<Sig>[] = [];

    for (const curr of currentRemaining) {
      const k = keyOf(curr, tier);
      if (k == null) {
        stillUnmatchedCurrent.push(curr);
        continue;
      }
      const picked = consumeFromBucket(baselineBuckets.get(k), tier, curr, refusals);
      if (picked == null) {
        stillUnmatchedCurrent.push(curr);
        continue;
      }
      const pair: MatchedPair<Sig> = { baseline: picked, current: curr, tier: tier.name };
      if (tier.heal) healed.push(pair);
      else matched.push(pair);
    }

    // Rebuild baselineRemaining from whatever is left in the buckets plus
    // items that were excluded from bucketization (missing tier key).
    const survivedBuckets: DiffItem<Sig>[] = [];
    for (const bucket of baselineBuckets.values()) survivedBuckets.push(...bucket);
    const excluded = baselineRemaining.filter((b) => keyOf(b, tier) == null);
    baselineRemaining.length = 0;
    baselineRemaining.push(...excluded, ...survivedBuckets);
    currentRemaining.length = 0;
    currentRemaining.push(...stillUnmatchedCurrent);
  }

  const fixed = baselineRemaining.slice();
  const newItems = currentRemaining.slice();

  const likelyMoved = detectLikelyMoved(newItems, fixed, refusals);

  // A refusal is only worth reporting when it left the current item unmatched;
  // a pair refused at T1 that healed to its true partner later has nothing to
  // explain.
  const refused: RefusedPair<Sig>[] = [];
  for (const curr of newItems) {
    const perCurrent = refusals.get(curr);
    if (perCurrent) refused.push(...perCurrent.values());
  }

  const result: DiffResult<Sig> = {
    matched,
    healed,
    fixed,
    new: newItems,
    likelyMoved,
    refused,
  };

  if (options?.grouping) {
    result.newGroups = groupItems(newItems, options.grouping);
    result.fixedGroups = groupItems(fixed, options.grouping);
    result.likelyMovedGroups = groupItems(
      likelyMoved.map((lm) => lm.current),
      options.grouping,
    );
  }

  return result;
}

const LIKELY_SIGNALS = ["tag", "htmlFingerprint", "relativeLocation"] as const;

function detectLikelyMoved<Sig extends string>(
  newItems: readonly DiffItem<Sig>[],
  fixedItems: readonly DiffItem<Sig>[],
  refusals: RefusalMemory<Sig>,
): LikelyMoved<Sig>[] {
  if (newItems.length === 0 || fixedItems.length === 0) return [];

  const fixedClaimed = new Set<DiffItem<Sig>>();
  const out: LikelyMoved<Sig>[] = [];

  for (const curr of newItems) {
    let best: { candidate: DiffItem<Sig>; shared: string[] } | null = null;
    for (const cand of fixedItems) {
      if (fixedClaimed.has(cand)) continue;
      if (cand.id !== curr.id) continue;
      // A refused pair is known not to be the same element; "likely moved"
      // would coach the developer into accepting an impostor.
      if (isRefused(refusals, curr, cand)) continue;
      const shared: string[] = [];
      for (const sig of LIKELY_SIGNALS) {
        const a = curr.signals[sig as Sig];
        const b = cand.signals[sig as Sig];
        if (a != null && a !== "" && a === b) shared.push(sig);
      }
      if (shared.length >= 2 && (best == null || shared.length > best.shared.length)) {
        best = { candidate: cand, shared };
      }
    }
    if (best) {
      fixedClaimed.add(best.candidate);
      out.push({ current: curr, candidate: best.candidate, sharedSignals: best.shared });
    }
  }

  return out;
}

function groupItems<Sig extends string>(
  items: readonly DiffItem<Sig>[],
  config: GroupingConfig<Sig>,
): Group<Sig>[] {
  const groups = new Map<string, Group<Sig>>();
  for (const item of items) {
    const groupSignals: Partial<Record<Sig, string>> = {};
    for (const sig of config.by) {
      const v = item.signals[sig];
      if (v != null && v !== "") groupSignals[sig] = v;
    }
    const key = item.id + NULL + config.by.map((s) => groupSignals[s] ?? "").join(NULL);
    let group = groups.get(key);
    if (!group) {
      group = { key, signals: groupSignals, count: 0, items: [] };
      groups.set(key, group);
    }
    group.count += 1;
    group.items.push(item);
  }
  return [...groups.values()];
}
