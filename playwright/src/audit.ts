/**
 * Core audit logic — IIFE injection, audit execution, and formatting.
 *
 * Works with both Page and Locator targets.
 */
import { createRequire } from "node:module";
import { getRuleById } from "@accesslint/core";
import type { Page, Locator, Frame } from "@playwright/test";

const require = createRequire(import.meta.url);
const iifePath = require.resolve("@accesslint/core/iife");

export interface AccessibleMatcherOptions {
  disabledRules?: string[];
  includeFrames?: boolean;
  includeShadowDom?: boolean;
}

export interface AuditViolation {
  ruleId: string;
  selector: string;
  html: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  message: string;
}

export interface AuditResult {
  url: string;
  timestamp: number;
  violations: AuditViolation[];
  ruleCount: number;
}

function isPage(target: Page | Locator): target is Page {
  return typeof (target as Page).goto === "function";
}

function getPage(target: Page | Locator): Page {
  if (isPage(target)) return target;
  return target.page();
}

async function ensureInjected(target: Page | Frame): Promise<void> {
  const hasAccessLint = await target.evaluate(() => typeof (window as any).AccessLint !== "undefined");
  if (!hasAccessLint) {
    await target.addScriptTag({ path: iifePath });
  }
}

async function auditShadowDom(target: Page | Frame): Promise<AuditViolation[]> {
  return target.evaluate(() => {
    const { getActiveRules, clearAllCaches } = (window as any).AccessLint;

    function findShadowRoots(root: Node): ShadowRoot[] {
      const roots: ShadowRoot[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.nextNode();
      while (node) {
        if ((node as Element).shadowRoot) {
          roots.push((node as Element).shadowRoot!);
          roots.push(...findShadowRoots((node as Element).shadowRoot!));
        }
        node = walker.nextNode();
      }
      return roots;
    }

    const shadowRoots = findShadowRoots(document);
    const violations: any[] = [];

    for (const shadowRoot of shadowRoots) {
      clearAllCaches();
      const rules = getActiveRules();
      for (const rule of rules) {
        try {
          const ruleViolations = rule.run(shadowRoot);
          violations.push(...ruleViolations);
        } catch {
          // Skip rules that don't work on shadow roots (e.g., html-has-lang)
        }
      }
    }

    // Filter to violations actually inside a shadow root (selector contains >>>).
    // Document-level rules may leak through without throwing; their selectors
    // (e.g. "html") won't have the shadow boundary delimiter.
    return violations
      .filter((v: any) => v.selector.includes(">>>"))
      .map((v: any) => ({
        ruleId: v.ruleId,
        selector: v.selector,
        html: v.html,
        impact: v.impact,
        message: v.message,
      }));
  });
}

async function getFrameSelectorPrefix(frame: Frame): Promise<string> {
  const parts: string[] = [];
  let current: Frame | null = frame;

  while (current && current.parentFrame()) {
    const parent: Frame = current.parentFrame()!;
    await ensureInjected(parent);
    const frameElementHandle = await current.frameElement();
    const selector = await parent.evaluate(
      (el) => (window as any).AccessLint.getSelector(el),
      frameElementHandle,
    );
    parts.unshift(selector + " >>>iframe>");
    current = parent;
  }

  return parts.join(" ");
}

async function auditFrames(page: Page, includeShadowDom: boolean): Promise<AuditViolation[]> {
  const violations: AuditViolation[] = [];
  const mainFrame = page.mainFrame();

  for (const frame of page.frames()) {
    if (frame === mainFrame) continue;
    if (frame.url() === "about:blank") continue;

    try {
      await ensureInjected(frame);
      const prefix = await getFrameSelectorPrefix(frame);

      const frameViolations: AuditViolation[] = await frame.evaluate(() => {
        const { runAudit } = (window as any).AccessLint;
        const raw = runAudit(document);
        return raw.violations.map((v: any) => ({
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
        }));
      });

      for (const v of frameViolations) {
        v.selector = prefix + " " + v.selector;
        violations.push(v);
      }

      if (includeShadowDom) {
        const shadowViolations = await auditShadowDom(frame);
        for (const v of shadowViolations) {
          v.selector = prefix + " " + v.selector;
          violations.push(v);
        }
      }
    } catch {
      // Skip detached frames
    }
  }

  return violations;
}

export async function accesslintAudit(
  target: Page | Locator,
  options?: AccessibleMatcherOptions,
): Promise<AuditResult> {
  const page = getPage(target);
  await ensureInjected(page);

  let result: AuditResult;

  if (isPage(target)) {
    result = await page.evaluate(() => {
      const { runAudit } = (window as any).AccessLint;
      const raw = runAudit(document);
      return {
        url: raw.url,
        timestamp: raw.timestamp,
        ruleCount: raw.ruleCount,
        violations: raw.violations.map((v: any) => ({
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
        })),
      };
    });

    if (options?.includeShadowDom !== false) {
      const shadowViolations = await auditShadowDom(page);
      result.violations.push(...shadowViolations);
    }

    if (options?.includeFrames !== false) {
      const frameViolations = await auditFrames(page, options?.includeShadowDom !== false);
      result.violations.push(...frameViolations);
    }
  } else {
    result = await target.evaluate((el) => {
      const { runAudit } = (window as any).AccessLint;
      const raw = runAudit(document);
      const scoped = raw.violations.filter((v: any) => {
        try {
          const violationEl = el.ownerDocument.querySelector(v.selector);
          return violationEl && el.contains(violationEl);
        } catch {
          return false;
        }
      });
      return {
        url: raw.url,
        timestamp: raw.timestamp,
        ruleCount: raw.ruleCount,
        violations: scoped.map((v: any) => ({
          ruleId: v.ruleId,
          selector: v.selector,
          html: v.html,
          impact: v.impact,
          message: v.message,
        })),
      };
    });
  }

  if (options?.disabledRules?.length) {
    const disabled = new Set(options.disabledRules);
    result.violations = result.violations.filter((v) => !disabled.has(v.ruleId));
  }

  return result;
}

export function formatViolation(v: AuditViolation): string {
  const rule = getRuleById(v.ruleId);
  const wcag = rule?.wcag?.length ? ` (${rule.wcag.join(", ")})` : "";
  const level = rule?.level ? ` [${rule.level}]` : "";
  return `  ${v.ruleId}${level}${wcag}: ${v.message}\n    ${v.selector}`;
}
