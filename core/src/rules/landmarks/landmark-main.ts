import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

export const landmarkMain: Rule = {
  id: "landmarks/landmark-main",
  category: "landmarks",
  wcag: [],
  level: "A",
  tags: ["best-practice", "page-level"],
  fixability: "contextual",
  description: "Page should have exactly one main landmark.",
  guidance: "The main landmark contains the primary content of the page. Screen readers allow users to jump directly to main content. Use a single <main> element (or role='main') to wrap the central content, excluding headers, footers, and navigation.",
  run(doc) {
    const mains = doc.querySelectorAll('main, [role="main"]');
    if (mains.length === 0) {
      return [{
        ruleId: "landmarks/landmark-main",
        selector: "html",
        html: "<html>",
        impact: "moderate" as const,
        message: "Page has no main landmark.",
      }];
    }
    if (mains.length > 1) {
      return Array.from(mains).slice(1).map((el) => ({
        ruleId: "landmarks/landmark-main",
        selector: getSelector(el),
        html: getHtmlSnippet(el),
        impact: "moderate" as const,
        message: "Page has multiple main landmarks.",
      }));
    }
    return [];
  },
};
