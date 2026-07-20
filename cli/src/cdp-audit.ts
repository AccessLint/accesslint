import type { TestEngine, TestEnvironment, Violation } from "@accesslint/core";
import { isFingerprintableTag, normalizeHtml, sha1Short } from "@accesslint/heal-diff/normalize";
import type { SnapshotViolation } from "@accesslint/matchers-internal/snapshot";

export { loadCoreIIFE } from "./iife-source.js";

export interface CoreAuditExprOptions {
  disabledRules?: string[];
  includeAAA?: boolean;
  componentMode?: boolean;
}

/**
 * Build the in-page expression that injects @accesslint/core and runs an audit.
 * Used by the CLI's single-shot live audit to produce stable violation identities.
 */
export function buildAuditExpression(
  iifeBytes: string,
  coreOptions: CoreAuditExprOptions,
  selector?: string,
): string {
  const optsJson = JSON.stringify(coreOptions);
  const selectorJson = selector ? JSON.stringify(selector) : "null";
  return `${iifeBytes}
;(async () => {
  try {
    const __r = window.AccessLint.runAudit(document, ${optsJson});
    if (typeof window.AccessLint.attachReactFiberSource === "function") {
      try { await window.AccessLint.attachReactFiberSource(__r.violations); } catch (_e) {}
    }
    const __selector = ${selectorJson};
    let __violations = __r.violations || [];
    if (__selector) {
      const __roots = Array.from(document.querySelectorAll(__selector));
      if (!__roots.length) throw new Error("Selector not found after wait: " + __selector);
      __violations = __violations.filter(function (v) {
        const el = document.querySelector(v.selector);
        return el && __roots.some(function (root) { return root === el || root.contains(el); });
      });
    }
    const AL = window.AccessLint;
    const _extractAnchor = typeof AL.extractAnchor === "function" ? AL.extractAnchor : null;
    const _getComputedRole = typeof AL.getComputedRole === "function" ? AL.getComputedRole : null;
    const _getAccessibleName = typeof AL.getAccessibleName === "function" ? AL.getAccessibleName : null;
    const _buildRelativeLocation = typeof AL.buildRelativeLocation === "function" ? AL.buildRelativeLocation : null;
    const _getRuleById = typeof AL.getRuleById === "function" ? AL.getRuleById : null;
    const _getResilientLocator = typeof AL.getResilientLocator === "function" ? AL.getResilientLocator : null;
    return JSON.stringify({
      ok: true,
      url: __r.url,
      timestamp: __r.timestamp,
      testEngine: __r.testEngine,
      testEnvironment: __r.testEnvironment,
      ruleCount: __r.ruleCount,
      skippedRules: __r.skippedRules || [],
      violations: __violations.map(function (v) {
        const el = v.element || null;
        const anchor = el && _extractAnchor ? _extractAnchor(el) : undefined;
        const roleBase = el && _getComputedRole ? _getComputedRole(el) : undefined;
        const roleName = el && _getAccessibleName ? _getAccessibleName(el).trim() : undefined;
        const role = roleBase ? (roleName ? roleBase + '[name="' + roleName + '"]' : roleBase) : undefined;
        const relativeLocation = el && _buildRelativeLocation ? _buildRelativeLocation(el) : undefined;
        const tag = el ? el.tagName.toLowerCase() : undefined;
        const resilientLocator = el && _getResilientLocator ? _getResilientLocator(el) : undefined;
        const rule = _getRuleById ? _getRuleById(v.ruleId) : undefined;
        return {
          ruleId: v.ruleId, selector: v.selector, html: v.html, impact: v.impact,
          message: v.message, source: v.source,
          wcag: rule && rule.wcag && rule.wcag.length ? rule.wcag : undefined,
          level: rule ? rule.level : undefined,
          description: rule ? rule.description : undefined,
          anchor: anchor || undefined,
          role: role || undefined,
          relativeLocation: relativeLocation || undefined,
          tag: tag || undefined,
          resilientLocator: resilientLocator || undefined,
        };
      }),
    });
  } catch (err) {
    return JSON.stringify({ ok: false, error: String((err && err.message) || err) });
  }
})()`;
}

export interface InPageViolation {
  ruleId: string;
  selector: string;
  html?: string;
  impact: Violation["impact"];
  message: string;
  source?: Violation["source"];
  wcag?: string[];
  level?: "A" | "AA" | "AAA";
  description?: string;
  anchor?: string;
  role?: string;
  relativeLocation?: string;
  tag?: string;
  resilientLocator?: string;
}

export interface InPageOk {
  ok: true;
  url: string;
  timestamp: number;
  testEngine: TestEngine;
  testEnvironment: TestEnvironment;
  ruleCount: number;
  skippedRules: { ruleId: string; error: string }[];
  violations: InPageViolation[];
}

export interface InPageErr {
  ok: false;
  error: string;
}

/** Map raw in-page violations to the stable identity used for snapshot diffing. */
export function mapInPageToSnapshot(violations: InPageViolation[]): SnapshotViolation[] {
  return violations.map((v) => {
    const sv: SnapshotViolation = { ruleId: v.ruleId, selector: v.resilientLocator || v.selector };
    if (v.anchor) sv.anchor = v.anchor;
    if (v.role) sv.role = v.role;
    if (v.relativeLocation) sv.relativeLocation = v.relativeLocation;
    if (v.tag) sv.tag = v.tag;
    if (v.html && (!v.tag || isFingerprintableTag(v.tag))) {
      sv.htmlFingerprint = sha1Short(normalizeHtml(v.html));
    }
    return sv;
  });
}
