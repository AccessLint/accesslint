import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import type { Violation } from "../rules/types";

export const IIFE_PATH = resolve(import.meta.dirname, "../../dist/index.iife.js");

export const iifeExists = existsSync(IIFE_PATH);

/**
 * Serializable subset of Violation — `element: Element` cannot cross
 * the Playwright evaluate boundary and is dropped during JSON round-trip.
 */
export type SerializedViolation = Omit<Violation, "element">;

interface AccessLintBrowserRule {
  id: string;
  actRuleIds?: string[];
  run(doc: Document): SerializedViolation[];
}

interface AccessLintBrowserGlobal {
  rules: AccessLintBrowserRule[];
  clearAllCaches(): void;
}

declare global {
  interface Window {
    AccessLint: AccessLintBrowserGlobal;
  }
}

/**
 * Inject the IIFE bundle and run a rule by its core rule ID.
 */
export async function runRule(page: Page, ruleId: string): Promise<SerializedViolation[]> {
  await page.addScriptTag({ path: IIFE_PATH });
  return page.evaluate((id) => {
    const { rules, clearAllCaches } = window.AccessLint;
    clearAllCaches();
    const rule = rules.find((r) => r.id === id);
    if (!rule) return [];
    return rule.run(document);
  }, ruleId);
}

/**
 * Inject the IIFE bundle and run every rule that lists the given
 * ACT rule ID in its actRuleIds. Returns the union of their violations.
 */
export async function runRuleByActId(
  page: Page,
  actRuleId: string,
): Promise<SerializedViolation[]> {
  await page.addScriptTag({ path: IIFE_PATH });
  return page.evaluate((actId) => {
    const { rules, clearAllCaches } = window.AccessLint;
    clearAllCaches();
    const matching = rules.filter((r) => r.actRuleIds?.includes(actId));
    if (matching.length === 0) return [];
    return matching.flatMap((rule) => rule.run(document));
  }, actRuleId);
}
