import type { ExpectedViolation, ClaudeViolation, RawViolation } from "./types.js";

// Signal 1: WCAG SC -> possible rule IDs
const WCAG_TO_RULES: Record<string, string[]> = {
  "1.1.1": [
    "text-alternatives/img-alt",
    "text-alternatives/image-alt-words",
    "text-alternatives/input-image-alt",
    "text-alternatives/role-img-alt",
    "text-alternatives/svg-img-alt",
  ],
  "1.3.1": [
    "adaptable/list-children",
    "adaptable/listitem-parent",
    "adaptable/definition-list",
    "adaptable/scope-attr-valid",
    "adaptable/empty-table-header",
  ],
  "1.4.4": ["distinguishable/meta-viewport"],
  "1.4.10": ["distinguishable/meta-viewport"],
  "2.1.1": ["keyboard-accessible/tabindex"],
  "2.2.2": ["enough-time/blink", "enough-time/marquee"],
  "2.4.1": ["navigable/bypass", "landmarks/region"],
  "2.4.2": ["navigable/document-title"],
  "2.4.4": ["navigable/link-name"],
  "2.4.6": [
    "navigable/heading-order",
    "navigable/empty-heading",
    "navigable/page-has-heading-one",
  ],
  "3.1.1": ["readable/html-has-lang"],
  "4.1.2": [
    "labels-and-names/button-name",
    "labels-and-names/form-label",
    "labels-and-names/input-button-name",
    "labels-and-names/frame-title",
    "labels-and-names/aria-dialog-name",
  ],
  "4.1.1": [
    "aria/aria-roles",
    "aria/aria-valid-attr-value",
    "aria/aria-allowed-role",
  ],
  "4.1.3": [
    "aria/aria-hidden-focus",
    "aria/presentation-role-conflict",
    "aria/presentational-children-focusable",
  ],
  "1.3.6": [
    "landmarks/landmark-main",
    "landmarks/banner-is-top-level",
    "landmarks/contentinfo-is-top-level",
    "landmarks/complementary-is-top-level",
  ],
};

// Signal 2: Keyword patterns on issue text -> rule ID
const KEYWORD_PATTERNS: Array<{ pattern: RegExp; ruleId: string }> = [
  // text-alternatives
  { pattern: /\balt\b.*\b(missing|attribute|text)\b/i, ruleId: "text-alternatives/img-alt" },
  { pattern: /\bimg\b.*\b(missing|no)\b.*\balt\b/i, ruleId: "text-alternatives/img-alt" },
  { pattern: /\bimage\b.*\b(missing|no)\b.*\balt\b/i, ruleId: "text-alternatives/img-alt" },
  { pattern: /\balt\b.*\b(suspicious|decorative|placeholder|redundant|filename)\b/i, ruleId: "text-alternatives/image-alt-words" },
  { pattern: /\bimage\b.*\balt\b.*\b(word|text)\b/i, ruleId: "text-alternatives/image-alt-words" },
  { pattern: /\binput.*type.*image\b.*\balt\b/i, ruleId: "text-alternatives/input-image-alt" },
  { pattern: /\brole.*img\b.*\b(alt|label|name)\b/i, ruleId: "text-alternatives/role-img-alt" },
  { pattern: /\bsvg\b.*\b(alt|label|name|title)\b/i, ruleId: "text-alternatives/svg-img-alt" },

  // labels-and-names
  { pattern: /\bbutton\b.*\b(name|label|text)\b/i, ruleId: "labels-and-names/button-name" },
  { pattern: /\b(form|input|select|textarea)\b.*\blabel\b/i, ruleId: "labels-and-names/form-label" },
  { pattern: /\blabel\b.*\b(form|input|select|textarea)\b/i, ruleId: "labels-and-names/form-label" },
  { pattern: /\binput.*button\b.*\bname\b/i, ruleId: "labels-and-names/input-button-name" },
  { pattern: /\b(iframe|frame)\b.*\btitle\b/i, ruleId: "labels-and-names/frame-title" },
  { pattern: /\bdialog\b.*\b(name|label)\b/i, ruleId: "labels-and-names/aria-dialog-name" },
  { pattern: /\balertdialog\b.*\b(name|label)\b/i, ruleId: "labels-and-names/aria-dialog-name" },

  // navigable
  { pattern: /\bheading\b.*\b(order|hierarchy|level|skip)\b/i, ruleId: "navigable/heading-order" },
  { pattern: /\bempty\b.*\bheading\b/i, ruleId: "navigable/empty-heading" },
  { pattern: /\bheading\b.*\bempty\b/i, ruleId: "navigable/empty-heading" },
  { pattern: /\b(page|document)\b.*\bheading\b.*\bone\b/i, ruleId: "navigable/page-has-heading-one" },
  { pattern: /\bh1\b.*\bmissing\b/i, ruleId: "navigable/page-has-heading-one" },
  { pattern: /\bmissing\b.*\bh1\b/i, ruleId: "navigable/page-has-heading-one" },
  { pattern: /\blink\b.*\b(name|text|accessible)\b/i, ruleId: "navigable/link-name" },
  { pattern: /\bdocument\b.*\btitle\b/i, ruleId: "navigable/document-title" },
  { pattern: /\btitle\b.*\b(missing|element)\b/i, ruleId: "navigable/document-title" },
  { pattern: /\bbypass\b.*\bblock/i, ruleId: "navigable/bypass" },
  { pattern: /\bskip\b.*\b(link|nav|content)\b/i, ruleId: "navigable/bypass" },

  // readable
  { pattern: /\blang\b.*\b(attribute|missing)\b/i, ruleId: "readable/html-has-lang" },
  { pattern: /\blanguage\b.*\b(missing|attribute|html)\b/i, ruleId: "readable/html-has-lang" },

  // aria
  { pattern: /\b(invalid|unknown)\b.*\brole\b/i, ruleId: "aria/aria-roles" },
  { pattern: /\brole\b.*\b(invalid|unknown|not allowed)\b/i, ruleId: "aria/aria-roles" },
  { pattern: /\baria\b.*\b(attribute|value)\b.*\binvalid\b/i, ruleId: "aria/aria-valid-attr-value" },
  { pattern: /\binvalid\b.*\baria\b.*\b(attribute|value)\b/i, ruleId: "aria/aria-valid-attr-value" },
  { pattern: /\brole\b.*\bnot\b.*\ballowed\b/i, ruleId: "aria/aria-allowed-role" },
  { pattern: /\ballowed\b.*\brole\b/i, ruleId: "aria/aria-allowed-role" },
  { pattern: /\baria-hidden\b.*\bfocus/i, ruleId: "aria/aria-hidden-focus" },
  { pattern: /\bfocus\b.*\baria-hidden\b/i, ruleId: "aria/aria-hidden-focus" },
  { pattern: /\bpresentation\b.*\b(role|conflict)\b/i, ruleId: "aria/presentation-role-conflict" },
  { pattern: /\bpresentational\b.*\bchildren\b.*\bfocus/i, ruleId: "aria/presentational-children-focusable" },

  // landmarks
  { pattern: /\b(main|landmark)\b.*\b(missing|region)\b/i, ruleId: "landmarks/landmark-main" },
  { pattern: /\bbanner\b.*\b(top.level|nested)\b/i, ruleId: "landmarks/banner-is-top-level" },
  { pattern: /\bcontentinfo\b.*\b(top.level|nested)\b/i, ruleId: "landmarks/contentinfo-is-top-level" },
  { pattern: /\bcomplementary\b.*\b(top.level|nested)\b/i, ruleId: "landmarks/complementary-is-top-level" },
  { pattern: /\bregion\b.*\b(landmark|outside)\b/i, ruleId: "landmarks/region" },
  { pattern: /\bcontent\b.*\boutside\b.*\blandmark\b/i, ruleId: "landmarks/region" },

  // adaptable
  { pattern: /\blist\b.*\bchildren\b/i, ruleId: "adaptable/list-children" },
  { pattern: /\blist\b.*\b(item|li)\b.*\bparent\b/i, ruleId: "adaptable/listitem-parent" },
  { pattern: /\bdefinition\b.*\blist\b/i, ruleId: "adaptable/definition-list" },
  { pattern: /\bscope\b.*\b(attribute|invalid)\b/i, ruleId: "adaptable/scope-attr-valid" },
  { pattern: /\bempty\b.*\btable\b.*\bheader\b/i, ruleId: "adaptable/empty-table-header" },
  { pattern: /\btable\b.*\bheader\b.*\bempty\b/i, ruleId: "adaptable/empty-table-header" },

  // distinguishable
  { pattern: /\bmeta\b.*\bviewport\b/i, ruleId: "distinguishable/meta-viewport" },
  { pattern: /\bviewport\b.*\b(scal|zoom)\b/i, ruleId: "distinguishable/meta-viewport" },
  { pattern: /\buser.scal/i, ruleId: "distinguishable/meta-viewport" },

  // keyboard
  { pattern: /\btabindex\b/i, ruleId: "keyboard-accessible/tabindex" },
  { pattern: /\btab\b.*\border\b.*\bpositive\b/i, ruleId: "keyboard-accessible/tabindex" },

  // enough-time
  { pattern: /\bblink\b/i, ruleId: "enough-time/blink" },
  { pattern: /\bmarquee\b/i, ruleId: "enough-time/marquee" },
];

function getCandidateRuleIds(violation: ClaudeViolation): string[] {
  const candidates = new Set<string>();

  // Signal 1: WCAG criterion
  const criterion = violation.wcagCriterion?.replace(/^sc\s*/i, "").trim();
  if (criterion) {
    const rules = WCAG_TO_RULES[criterion];
    if (rules) {
      for (const r of rules) candidates.add(r);
    }
  }

  // Signal 2: Keyword patterns on issue text
  for (const { pattern, ruleId } of KEYWORD_PATTERNS) {
    if (pattern.test(violation.issue)) {
      candidates.add(ruleId);
    }
  }

  return [...candidates];
}

function elementMatchScore(
  claudeElement: string,
  selectorPattern: string
): number {
  if (!claudeElement || !selectorPattern) return 0;

  const ce = claudeElement.toLowerCase().trim();
  const sp = selectorPattern.toLowerCase().trim();

  // Exact match
  if (ce === sp) return 10;

  // Substring match in either direction
  if (ce.includes(sp) || sp.includes(ce)) return 7;

  // Extract tag names
  const ceTag = ce.match(/^([a-z][a-z0-9]*)/)?.[1];
  const spTag = sp.match(/^([a-z][a-z0-9]*)/)?.[1];

  let score = 0;

  // Tag name match
  if (ceTag && spTag && ceTag === spTag) {
    score += 3;
  }

  // Shared attributes
  const ceAttrs = [...ce.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  const spAttrs = [...sp.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  for (const ca of ceAttrs) {
    for (const sa of spAttrs) {
      if (ca === sa) score += 3;
      else if (ca.split("=")[0] === sa.split("=")[0]) score += 1;
    }
  }

  // nth-of-type index comparison
  const ceNth = ce.match(/nth-of-type\((\d+)\)/)?.[1];
  const spNth = sp.match(/nth-of-type\((\d+)\)/)?.[1];
  if (ceNth && spNth && ceNth === spNth) score += 2;

  return score;
}

const IMPACT_SCORES: Record<string, number> = {
  critical: 3,
  serious: 2,
  moderate: 1,
  minor: 0,
};

export interface MatchResult {
  tp: number;
  fp: number;
  fn: number;
  matched: Array<{
    expected: ExpectedViolation;
    claudeViolation: ClaudeViolation;
  }>;
  falsePositives: ClaudeViolation[];
  missed: ExpectedViolation[];
}

export function matchClaudeViolations(
  claudeViolations: ClaudeViolation[],
  expectedViolations: ExpectedViolation[]
): MatchResult {
  const alreadyMatched = new Set<number>();
  const matched: MatchResult["matched"] = [];
  const falsePositives: ClaudeViolation[] = [];

  for (const cv of claudeViolations) {
    const candidateRuleIds = getCandidateRuleIds(cv);

    let bestIdx = -1;
    let bestScore = 0;

    for (let i = 0; i < expectedViolations.length; i++) {
      if (alreadyMatched.has(i)) continue;

      const ev = expectedViolations[i];

      // Check if rule ID matches via candidates
      if (!candidateRuleIds.includes(ev.ruleId)) continue;

      // Element match score
      const elemScore = elementMatchScore(cv.element, ev.selectorPattern);

      // Impact match bonus
      const impactBonus =
        cv.impact === ev.impact
          ? 2
          : Math.abs(
              (IMPACT_SCORES[cv.impact] ?? 0) -
                (IMPACT_SCORES[ev.impact] ?? 0)
            ) <= 1
            ? 1
            : 0;

      const totalScore = elemScore + impactBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      alreadyMatched.add(bestIdx);
      matched.push({
        expected: expectedViolations[bestIdx],
        claudeViolation: cv,
      });
    } else {
      falsePositives.push(cv);
    }
  }

  const missed = expectedViolations.filter(
    (_, i) => !alreadyMatched.has(i)
  );

  return {
    tp: matched.length,
    fp: falsePositives.length,
    fn: missed.length,
    matched,
    falsePositives,
    missed,
  };
}

export function claudeToRawViolations(
  violations: ClaudeViolation[],
  expectedViolations: ExpectedViolation[]
): RawViolation[] {
  const matchResult = matchClaudeViolations(violations, expectedViolations);

  const raw: RawViolation[] = [];

  for (const m of matchResult.matched) {
    raw.push({
      ruleId: m.expected.ruleId,
      selector: m.claudeViolation.element,
      impact: m.claudeViolation.impact,
      issue: m.claudeViolation.issue,
      wcagCriterion: m.claudeViolation.wcagCriterion,
    });
  }

  for (const fp of matchResult.falsePositives) {
    const candidates = getCandidateRuleIds(fp);
    raw.push({
      ruleId: candidates[0] ?? "unknown",
      selector: fp.element,
      impact: fp.impact,
      issue: fp.issue,
      wcagCriterion: fp.wcagCriterion,
    });
  }

  return raw;
}
