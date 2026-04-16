import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

export const IIFE_PATH = resolve(
  import.meta.dirname,
  "../../dist/index.iife.js",
);

export const iifeExists = existsSync(IIFE_PATH);

/**
 * Inject the IIFE bundle and run a rule by its core rule ID.
 * Returns the violations array from rule.run(document).
 */
export async function runRule(page: Page, ruleId: string): Promise<any[]> {
  await page.addScriptTag({ path: IIFE_PATH });
  return page.evaluate((id) => {
    const { rules, clearAllCaches } = (window as any).AccessLint;
    clearAllCaches();
    const rule = rules.find((r: any) => r.id === id);
    if (!rule) return [];
    return rule.run(document);
  }, ruleId);
}

/**
 * Inject the IIFE bundle and run a rule by its ACT rule ID.
 * Returns the violations array from rule.run(document).
 */
export async function runRuleByActId(
  page: Page,
  actRuleId: string,
): Promise<any[]> {
  await page.addScriptTag({ path: IIFE_PATH });
  return page.evaluate((actId) => {
    const { rules, clearAllCaches } = (window as any).AccessLint;
    clearAllCaches();
    const matching = rules.filter((r: any) => r.actRuleIds?.includes(actId));
    if (matching.length === 0) return [];
    return matching.flatMap((rule: any) => rule.run(document));
  }, actRuleId);
}
