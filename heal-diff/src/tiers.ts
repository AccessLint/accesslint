import type { Tier, TierKey } from "./diff";

/** Small constructor helper so callers don't need to remember all the optional fields. */
export function buildTier<Sig extends string>(args: {
  name: string;
  key: readonly TierKey<Sig>[];
  heal: boolean;
  uniquenessGated?: boolean;
}): Tier<Sig> {
  return {
    name: args.name,
    key: args.key,
    heal: args.heal,
    uniquenessGated: args.uniquenessGated,
  };
}
