import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

/** True when an iframe/frame is hidden and not exposed to assistive technology. */
export function isHiddenFrame(frame: Element): boolean {
  if (!(frame instanceof HTMLElement)) return false;
  // Inline style checks
  if (frame.style.display === "none") return true;
  if (frame.style.visibility === "hidden") return true;
  // Zero or 1×1 tracking pixel dimensions (attribute or inline style)
  const w = frame.getAttribute("width");
  const h = frame.getAttribute("height");
  if ((w === "0" || w === "1") && (h === "0" || h === "1")) return true;
  return false;
}

/**
 * Parse a meta refresh content attribute, extracting the delay in seconds
 * and whether it contains a valid URL redirect.
 */
export function parseMetaRefreshContent(content: string): { seconds: number; hasValidUrl: boolean } | null {
  const match = content.match(/^(\d+)/);
  if (!match) return null;
  const seconds = parseInt(match[1], 10);

  // Valid URL redirect: number followed by ; or , then either:
  //   - url= prefix (with any URL, including relative), or
  //   - an absolute http(s) URL
  const hasValidUrl = /^\d+\s*[;,]\s*url\s*=/i.test(content) ||
    /^\d+\s*[;,]\s*['"]?\s*https?:/i.test(content);

  return { seconds, hasValidUrl };
}

// Selectors for sectioning elements that scope landmarks
export const SECTIONING_SELECTOR = 'article, aside, main, nav, section, [role="article"], [role="complementary"], [role="main"], [role="navigation"], [role="region"]';

// Landmark selectors
export const LANDMARK_SELECTOR = 'main, [role="main"], header, [role="banner"], footer, [role="contentinfo"], nav, [role="navigation"], aside, [role="complementary"], section[aria-label], section[aria-labelledby], [role="region"][aria-label], [role="region"][aria-labelledby], form[aria-label], form[aria-labelledby], [role="form"][aria-label], [role="form"][aria-labelledby], [role="search"]';

/**
 * Factory for "nested landmark" rules. These rules check that elements with
 * a given role are not nested inside sectioning content.
 */
export function makeNestedLandmarkRule(opts: {
  id: string;
  selector: string;
  landmarkName: string;
  description: string;
  guidance: string;
}): Rule {
  return {
    id: opts.id,
    category: opts.id.split("/")[0],
    wcag: [],
    level: "A",
    tags: ["best-practice", "page-level"],
    fixability: "contextual",
    description: opts.description,
    guidance: opts.guidance,
    run(doc) {
      const violations: Violation[] = [];
      for (const el of doc.querySelectorAll(opts.selector)) {
        if (el.closest(SECTIONING_SELECTOR)) {
          violations.push({
            ruleId: opts.id,
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "moderate" as const,
            message: `${opts.landmarkName} landmark is nested within another landmark.`,
          });
        }
      }
      return violations;
    },
  };
}

/**
 * Factory for "no duplicate landmark" rules. These rules check that at most
 * one top-level element matches a given selector.
 */
export function makeNoDuplicateLandmarkRule(opts: {
  id: string;
  selector: string;
  landmarkName: string;
  description: string;
  guidance: string;
  filterTopLevel: boolean;
}): Rule {
  return {
    id: opts.id,
    category: opts.id.split("/")[0],
    wcag: [],
    level: "A",
    tags: ["best-practice", "page-level"],
    fixability: "contextual",
    description: opts.description,
    guidance: opts.guidance,
    run(doc) {
      const violations: Violation[] = [];
      const els = doc.querySelectorAll(opts.selector);
      const candidates = opts.filterTopLevel
        ? Array.from(els).filter((el) => !el.closest(SECTIONING_SELECTOR))
        : Array.from(els);

      if (candidates.length > 1) {
        candidates.slice(1).forEach((el) =>
          violations.push({
            ruleId: opts.id,
            selector: getSelector(el),
            html: getHtmlSnippet(el),
            impact: "moderate" as const,
            message: `Page has multiple ${opts.landmarkName} landmarks.`,
          })
        );
      }
      return violations;
    },
  };
}
