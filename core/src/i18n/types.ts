export interface RuleTranslation {
  description: string;
  guidance?: string;
  /** Violation message translations. Keys are English message templates
   *  (use {0}, {1}, etc. for interpolated values), values are translated templates. */
  messages?: Record<string, string>;
}

export type LocaleMap = Record<string, RuleTranslation>;
