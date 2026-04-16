import type { Rule, Violation } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";
import { isAriaHidden } from "../utils/aria";
import { LANDMARK_SELECTOR } from "./constants";

export const region: Rule = {
  id: "landmarks/region",
  category: "landmarks",
  wcag: [],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "contextual",
  description: "All page content should be contained within landmarks.",
  guidance: "Screen reader users navigate pages by landmarks. Content outside landmarks is harder to find and understand. Wrap all visible content in appropriate landmarks: <header>, <nav>, <main>, <aside>, <footer>, or <section> with a label. Skip links may exist outside landmarks.",
  run(doc) {
    const violations: Violation[] = [];
    const body = doc.body;
    if (!body) return [];

    // Walk through direct children of body
    for (const child of body.children) {
      if (isAriaHidden(child)) continue;
      if (child instanceof HTMLScriptElement || child instanceof HTMLStyleElement) continue;
      if (child.tagName === "NOSCRIPT") continue;
      if (child instanceof HTMLElement && child.hidden) continue;

      // Skip links are allowed outside landmarks
      if (child.matches('a[href^="#"]')) continue;

      // Check if it's a landmark or inside one
      const isLandmark = child.matches(LANDMARK_SELECTOR);
      const containsContent = child.textContent?.trim();

      if (!isLandmark && containsContent) {
        // Check if this element contains landmarks (wrapper divs are ok)
        const hasLandmarkChild = child.querySelector(LANDMARK_SELECTOR);
        if (!hasLandmarkChild) {
          violations.push({
            ruleId: "landmarks/region",
            selector: getSelector(child),
            html: getHtmlSnippet(child),
            impact: "moderate" as const,
            message: "Content is not contained within a landmark region.",
          });
        }
      }
    }
    return violations;
  },
};
