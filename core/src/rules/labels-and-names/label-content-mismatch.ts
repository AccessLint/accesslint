import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { getAccessibleName, isAriaHidden, getVisibleText } from "../utils/aria";

// ACT rule 2ee8b8's label-in-name algorithm: case fold, apply compatibility
// normalization, then replace every character that is not a letter or a digit
// with a space. Punctuation therefore never decides a match — a theme that
// appends ", " to every card's aria-label reads as the title it already is.
// (The algorithm specifies NFKD; NFKC folds the same compatibility variants
// without splitting accented letters into a base and a floating mark, which
// the replace step below would turn into a word break.)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, " ")
    .trim();
}

/** Quote strings as the page reads them, not as the markup happens to indent. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Above this many words the visible text is a card's contents, not a label. */
const CARD_WORD_COUNT = 8;

/**
 * True when the accessible name carries the words the visible text opens with.
 *
 * A card link holds more text than any label: a title, a byline, and a body
 * quote, all flattened into one string. WCAG 2.5.3 asks about the text that
 * reads as the label, which on a card is the title, the first thing rendered.
 * So "Jane Doe's testimonial" is judged against "Jane Doe" and not against the
 * paragraph beneath it. A name that carries none of the opening words still
 * fails, so a card whose label drops its title is still reported.
 */
function containsLeadingWords(normAccessible: string, normVisible: string): boolean {
  const words = normVisible.split(" ");
  if (words.length <= CARD_WORD_COUNT) return false;

  let run = "";
  for (const word of words) {
    const extended = run ? `${run} ${word}` : word;
    if (!normAccessible.includes(extended)) break;
    run = extended;
  }
  // One incidental short word ("the", "our") is not a title.
  return run.split(" ").some((word) => word.length > 3);
}

function visibleTextMatches(accessibleName: string, visibleText: string): boolean {
  const normAccessible = normalizeText(accessibleName);
  const normVisible = normalizeText(visibleText);

  if (!normAccessible || !normVisible) return true;

  // Per WCAG 2.5.3, the visible label text should be included in the accessible name.
  // Check if accessible name contains the visible text (primary check).
  if (normAccessible.includes(normVisible)) return true;

  // Also accept: visible text contains the accessible name (e.g. button
  // shows "Submit Order" but aria-label is "Submit").
  if (normVisible.includes(normAccessible)) return true;

  // Accept if most significant words of the visible text appear in the
  // accessible name.  This handles cases like "Parks By State" (aria-label)
  // vs "By State..." (visible text after icons/prefixes are stripped).
  // A control whose visible text is a single significant word beside
  // decorative glyphs passes on that word alone, as in
  // `<a aria-label="Deploy on Vercel"><span>\u25b2</span><span>Deploy</span></a>`.
  const visibleWords = normVisible.split(" ").filter((w) => w.length > 2);
  if (visibleWords.length >= 1) {
    const matchingWords = visibleWords.filter((w) => normAccessible.includes(w));
    if (matchingWords.length / visibleWords.length > 0.5) return true;
  }

  // The overlap ratio inverts on text-rich controls: the longer the card, the
  // smaller the share its title can hold, so judge those on the title alone.
  if (containsLeadingWords(normAccessible, normVisible)) return true;

  return false;
}

/**
 * The text inside `el` that reads as its label, when the control holds more
 * than a label. A card link wraps a title heading alongside an author, a date,
 * and category tags: the title is what a voice-control user speaks, and it is
 * the only part the accessible name has to carry. Comparing against the whole
 * flattened card instead makes the verdict turn on how many tags that card
 * happens to have, so ten cards built from one template disagree.
 */
function getLabelHeadingText(el: Element): string {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
  if (!heading || isAriaHidden(heading)) return "";
  return getVisibleText(heading);
}

export const labelContentMismatch: Rule = {
  id: "labels-and-names/label-content-mismatch",
  category: "labels-and-names",
  actRuleIds: ["2ee8b8"],
  wcag: ["2.5.3"],
  level: "A",
  tags: ["best-practice"],
  fixability: "contextual",
  browserHint:
    "Screenshot the control to see its visible label, then ensure aria-label starts with that visible text.",
  description:
    "Interactive elements with visible text must have accessible names that contain that text.",
  guidance:
    "For voice control users who activate controls by speaking their visible label, the accessible name must include the visible text. If aria-label is 'Submit form' but the button shows 'Send', voice users saying 'click Send' won't activate it. Ensure aria-label/aria-labelledby contains or matches the visible text.",
  run(doc) {
    const violations = [];

    // Check buttons
    for (const el of doc.querySelectorAll(
      'button, [role="button"], a[href], input[type="submit"], input[type="button"]',
    )) {
      if (isAriaHidden(el)) continue;

      const accessibleName = getAccessibleName(el);
      if (!accessibleName) continue; // No name - different violation

      // Get visible text (excludes SVG icons, aria-hidden, role=img)
      let visibleText = "";
      if (el instanceof HTMLInputElement) {
        visibleText = el.value || "";
      } else {
        visibleText = getVisibleText(el);
      }

      const trimmedVisible = visibleText.trim();
      if (!trimmedVisible) continue; // No visible text to compare
      // Skip very short visible text (1-2 chars) — likely icons/symbols (×, ✓, ☰)
      if (trimmedVisible.length <= 2) continue;

      // Only check if there's an explicit aria-label or aria-labelledby
      // that might differ from the visible text
      const hasAriaLabel = el.hasAttribute("aria-label");
      const hasAriaLabelledby = el.hasAttribute("aria-labelledby");

      if (!hasAriaLabel && !hasAriaLabelledby) continue;

      if (visibleTextMatches(accessibleName, visibleText)) continue;

      // A control that holds a heading passes on the heading alone, so the
      // metadata printed next to it cannot swing the verdict.
      const headingText = getLabelHeadingText(el).trim();
      if (headingText && normalizeText(accessibleName).includes(normalizeText(headingText))) {
        continue;
      }

      violations.push({
        ruleId: "labels-and-names/label-content-mismatch",
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "serious" as const,
        message: `Accessible name "${collapseWhitespace(accessibleName)}" does not contain visible text "${collapseWhitespace(visibleText)}".`,
        fix: {
          type: "suggest",
          suggestion:
            "Update aria-label to include the visible text content so voice control users can activate this element by speaking its label",
        } as const,
      });
    }

    // Check labeled form fields
    for (const el of doc.querySelectorAll("input, select, textarea")) {
      if (isAriaHidden(el)) continue;
      if (
        el instanceof HTMLInputElement &&
        ["hidden", "submit", "button", "image"].includes(el.type)
      )
        continue;

      const accessibleName = getAccessibleName(el);
      if (!accessibleName) continue;

      // Check for aria-label overriding visible label
      const hasAriaLabel = el.hasAttribute("aria-label");
      if (!hasAriaLabel) continue;

      // Find visible label text
      const id = el.id;
      let visibleLabel = "";
      if (id) {
        const label = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) {
          visibleLabel = getVisibleText(label);
        }
      }

      if (!visibleLabel.trim()) continue;

      if (!visibleTextMatches(accessibleName, visibleLabel)) {
        violations.push({
          ruleId: "labels-and-names/label-content-mismatch",
          selector: getSelector(el),
          html: getHtmlSnippet(el),
          impact: "serious" as const,
          message: `Accessible name "${collapseWhitespace(accessibleName)}" does not contain visible label "${collapseWhitespace(visibleLabel)}".`,
          fix: {
            type: "suggest",
            suggestion:
              "Update aria-label to include the visible label text so voice control users can activate this element by speaking its label",
          } as const,
        });
      }
    }

    return violations;
  },
};
