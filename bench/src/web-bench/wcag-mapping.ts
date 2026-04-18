/**
 * Convert axe-core WCAG tags to dot-notation WCAG criteria.
 *
 * axe tags rules with patterns like "wcag111" (= 1.1.1) and "wcag1412" (= 1.4.12).
 * The format is: wcag + principle(1 digit) + guideline(1 digit) + criterion(1+ digits).
 * Level tags like "wcag2a" and "wcag21aa" are filtered out by the regex.
 */
export function axeTagToWcagCriterion(tag: string): string | null {
  const match = tag.match(/^wcag(\d)(\d)(\d+)$/);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

/** Extract all WCAG criteria from an axe violation's tags array. */
export function extractAxeWcagCriteria(tags: string[]): string[] {
  return tags.map(axeTagToWcagCriterion).filter((c): c is string => c !== null);
}

/**
 * Known pairs where one WCAG criterion is a stricter (higher conformance level)
 * variant of another. Maps stricter → base.
 *
 * These are the well-known pairs from the WCAG spec hierarchy. When a single axe
 * rule tags both the base and stricter variant, we keep only the base to avoid
 * double-counting.
 */
const KNOWN_OVERLAPPING_PAIRS: [string, string][] = [
  // [stricter, base]
  ["2.1.3", "2.1.1"], // Keyboard No Exception (AAA) → Keyboard (A)
  ["2.4.9", "2.4.4"], // Link Purpose (Link Only) (AAA) → Link Purpose (In Context) (A)
  ["2.4.10", "2.4.6"], // Section Headings (AAA) → Headings and Labels (AA)
  ["3.2.5", "3.2.2"], // Change on Request (AAA) → On Input (A)
  ["3.3.6", "3.3.4"], // Error Prevention (All) (AAA) → Error Prevention (Legal, etc.) (AA)
  ["1.4.6", "1.4.3"], // Contrast (Enhanced) (AAA) → Contrast (Minimum) (AA)
  ["1.4.9", "1.4.5"], // Images of Text (No Exception) (AAA) → Images of Text (AA)
];

/**
 * Build OVERLAPPING_CRITERIA dynamically by combining known WCAG pairs with
 * any additional pairs discovered from axe's tag metadata.
 */
async function buildOverlappingCriteria(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  // Start with known spec-level pairs
  for (const [stricter, base] of KNOWN_OVERLAPPING_PAIRS) {
    map[stricter] = base;
  }

  // Dynamically scan axe rules for pairs where one rule maps to both
  // a base criterion and a stricter variant in the same guideline group.
  // This catches any new overlaps axe adds in future versions.
  try {
    const axe = await import("axe-core");
    const getRules = (axe as any).default?.getRules ?? (axe as any).getRules;
    if (getRules) {
      const rules = getRules() as { ruleId: string; tags: string[] }[];
      for (const rule of rules) {
        const criteria = extractAxeWcagCriteria(rule.tags);
        if (criteria.length < 2) continue;

        // Group by guideline (first two segments: "X.Y")
        const byGuideline = new Map<string, string[]>();
        for (const c of criteria) {
          const parts = c.split(".");
          const guideline = `${parts[0]}.${parts[1]}`;
          const existing = byGuideline.get(guideline) ?? [];
          existing.push(c);
          byGuideline.set(guideline, existing);
        }

        // Within each guideline group, the higher SC number is stricter
        for (const group of byGuideline.values()) {
          if (group.length < 2) continue;
          group.sort((a, b) => {
            const aNum = parseInt(a.split(".")[2]);
            const bNum = parseInt(b.split(".")[2]);
            return aNum - bNum;
          });
          const base = group[0];
          for (let i = 1; i < group.length; i++) {
            if (!map[group[i]]) {
              map[group[i]] = base;
            }
          }
        }
      }
    }
  } catch {
    // axe-core not available at build time — use static pairs only
  }

  return map;
}

const OVERLAPPING_CRITERIA = await buildOverlappingCriteria();

/**
 * Deduplicate criteria produced by a single axe rule.
 * If a rule emits both a base and stricter criterion, drop the stricter one.
 */
export function deduplicateOverlapping(criteria: string[]): string[] {
  return criteria.filter((c) => {
    const base = OVERLAPPING_CRITERIA[c];
    return !base || !criteria.includes(base);
  });
}
