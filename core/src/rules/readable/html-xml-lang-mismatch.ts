import type { Rule } from "../types";
import { getHtmlSnippet } from "../utils/selector";

export const htmlXmlLangMismatch: Rule = {
  id: "readable/html-xml-lang-mismatch",
  category: "readable",
  wcag: ["3.1.1"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  description: "The lang and xml:lang attributes on <html> must match.",
  guidance: "In XHTML documents, if both lang and xml:lang are present, they must specify the same base language. Mismatched values confuse assistive technologies. Either remove xml:lang (preferred for HTML5) or ensure both attributes have identical values.",
  run(doc) {
    const html = doc.documentElement;
    const lang = html.getAttribute("lang")?.trim().toLowerCase();
    const xmlLang = html.getAttribute("xml:lang")?.trim().toLowerCase();

    if (lang && xmlLang) {
      // Extract primary language subtag for comparison
      const langPrimary = lang.split("-")[0];
      const xmlLangPrimary = xmlLang.split("-")[0];

      if (langPrimary !== xmlLangPrimary) {
        return [{
          ruleId: "readable/html-xml-lang-mismatch",
          selector: "html",
          html: getHtmlSnippet(html),
          impact: "moderate" as const,
          message: `lang="${lang}" and xml:lang="${xmlLang}" do not match.`,
          fix: { type: "remove-attribute", attribute: "xml:lang" } as const,
        }];
      }
    }

    return [];
  },
};
