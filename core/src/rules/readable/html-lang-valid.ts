import type { Rule } from "../types";
import { getHtmlSnippet } from "../utils/selector";
import { isValidLangTag } from "./constants";

export const htmlLangValid: Rule = {
  id: "readable/html-lang-valid",
  category: "readable",
  actRuleIds: ["bf051a"],
  wcag: ["3.1.1"],
  level: "A",
  tags: ["page-level"],
  fixability: "mechanical",
  description: "The lang attribute on <html> must have a valid value.",
  guidance: "The lang attribute must use a valid BCP 47 language tag. Use a 2 or 3 letter language code (e.g., 'en', 'fr', 'zh'), optionally followed by a region code (e.g., 'en-US', 'pt-BR'). Invalid tags prevent screen readers from correctly pronouncing content.",
  run(doc) {
    const lang = doc.documentElement.getAttribute("lang")?.trim();
    if (lang && !isValidLangTag(lang)) {
      return [{
        ruleId: "readable/html-lang-valid",
        selector: "html",
        html: getHtmlSnippet(doc.documentElement),
        impact: "serious" as const,
        message: `Invalid lang attribute value "${lang}".`,
        fix: { type: "set-attribute", attribute: "lang", value: "en" } as const,
      }];
    }
    return [];
  },
};
