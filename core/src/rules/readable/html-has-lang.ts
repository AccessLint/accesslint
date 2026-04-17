import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

export const htmlHasLang: Rule = {
  id: "readable/html-has-lang",
  category: "readable",
  actRuleIds: ["b5c3f8"],
  wcag: ["3.1.1"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  description: "The <html> element must have a lang attribute.",
  guidance:
    "Screen readers use the lang attribute to determine which language rules and pronunciation to use. Without it, content may be mispronounced. Set lang to the primary language of the page using a BCP 47 code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'ja' for Japanese, 'zh' for Chinese, 'pt' for Portuguese, 'ar' for Arabic).",
  run(doc) {
    const html = doc.documentElement;
    // Only applies to HTML documents (not SVG or MathML roots)
    if (html.tagName.toLowerCase() !== "html") return [];

    // Skip non-HTML documents (SVG or MathML parsed as text/html by DOMParser)
    if (!doc.doctype && doc.body) {
      const children = doc.body.children;
      if (
        children.length > 0 &&
        Array.from(children).every(
          (c) => c.tagName.toLowerCase() === "svg" || c.tagName.toLowerCase() === "math",
        )
      )
        return [];
    }

    if (!html.getAttribute("lang")?.trim()) {
      // Sample visible text to help determine language
      let textSample: string | undefined;
      if (doc.body) {
        const text = doc.body.textContent?.trim().replace(/\s+/g, " ") || "";
        if (text) textSample = text.slice(0, 200);
      }
      return [
        {
          ruleId: "readable/html-has-lang",
          selector: getSelector(html),
          html: getHtmlSnippet(html),
          impact: "serious" as const,
          message: "<html> element missing lang attribute.",
          context: textSample ? `Page text sample: "${textSample}"` : undefined,
          fix: { type: "add-attribute", attribute: "lang", value: "en" } as const,
        },
      ];
    }
    return [];
  },
};
