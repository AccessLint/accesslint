import type { Rule, Violation } from "../rules/types";
import type { LocaleMap } from "./types";

const locales = new Map<string, LocaleMap>();

export function registerLocale(locale: string, translations: LocaleMap): void {
  locales.set(locale, translations);
  compiledPatterns.delete(locale);
}

export function applyLocale(rules: Rule[], locale: string): Rule[] {
  const translations = locales.get(locale);
  if (!translations) return rules;

  return rules.map((rule) => {
    const t = translations[rule.id];
    if (!t) return rule;
    return {
      ...rule,
      description: t.description,
      guidance: t.guidance !== undefined ? t.guidance : rule.guidance,
    };
  });
}

// --- Message template translation ---

interface CompiledPattern {
  regex: RegExp;
  translated: string;
}

// Cache: locale → ruleId → compiled patterns
const compiledPatterns = new Map<string, Map<string, CompiledPattern[]>>();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileTemplate(template: string): RegExp {
  const parts = template.split(/\{(\d+)\}/);
  let regexStr = "^";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      regexStr += escapeRegex(parts[i]);
    } else {
      regexStr += "(.+?)";
    }
  }
  regexStr += "$";
  return new RegExp(regexStr);
}

function getPatternsForRule(
  locale: string,
  ruleId: string,
): CompiledPattern[] | undefined {
  let localeCache = compiledPatterns.get(locale);
  if (!localeCache) {
    localeCache = new Map();
    compiledPatterns.set(locale, localeCache);
  }

  if (localeCache.has(ruleId)) return localeCache.get(ruleId)!;

  const translations = locales.get(locale);
  if (!translations) return undefined;

  const rule = translations[ruleId];
  if (!rule?.messages) {
    localeCache.set(ruleId, []);
    return [];
  }

  const patterns: CompiledPattern[] = [];
  for (const [enTemplate, transTemplate] of Object.entries(rule.messages)) {
    patterns.push({
      regex: compileTemplate(enTemplate),
      translated: transTemplate,
    });
  }
  localeCache.set(ruleId, patterns);
  return patterns;
}

function translateMessage(
  ruleId: string,
  message: string,
  locale: string,
): string {
  const patterns = getPatternsForRule(locale, ruleId);
  if (!patterns) return message;

  for (const { regex, translated } of patterns) {
    const match = message.match(regex);
    if (match) {
      return translated.replace(/\{(\d+)\}/g, (_, idx) => {
        const i = parseInt(idx, 10);
        return i + 1 < match.length ? match[i + 1] : `{${idx}}`;
      });
    }
  }
  return message;
}

export function translateViolations(
  violations: Violation[],
  locale: string,
): Violation[] {
  if (!locales.has(locale)) return violations;

  return violations.map((v) => {
    const translated = translateMessage(v.ruleId, v.message, locale);
    if (translated === v.message) return v;
    return { ...v, message: translated };
  });
}
