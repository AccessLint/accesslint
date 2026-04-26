import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";
import type { Violation } from "../rules/types";

export const IIFE_PATH = resolve(import.meta.dirname, "../../dist/index.iife.js");

export const iifeExists = existsSync(IIFE_PATH);

/**
 * IIFE bundle text, read once per worker. Inlined into a sandboxed iframe
 * per test — `page.addInitScript` does not propagate into sandboxed iframes,
 * and injecting a `<script src>` would require serving the file over HTTP.
 */
const IIFE_TEXT = iifeExists ? readFileSync(IIFE_PATH, "utf-8") : "";

/**
 * Serializable subset of Violation — `element: Element` cannot cross
 * the Playwright evaluate boundary and is dropped during JSON round-trip.
 */
export type SerializedViolation = Omit<Violation, "element">;

interface AccessLintBrowserRule {
  id: string;
  actRuleIds?: string[];
  applicable?(doc: Document): boolean;
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

const HOST_HTML = "<!doctype html><html><head></head><body></body></html>";

/**
 * Run an ACT rule against fixture HTML hosted inside a sandboxed iframe.
 *
 * The iframe uses `sandbox="allow-scripts allow-same-origin"`. Scripts run
 * inside it (so we can inline the IIFE and execute the rule in the iframe's
 * realm, making `instanceof HTMLInputElement` and similar checks work for
 * iframe-owned elements), while the absence of `allow-top-navigation` means
 * any `<meta http-equiv="refresh">` in the fixture can only ever navigate
 * the iframe itself — the top-level Playwright page stays alive.
 *
 * Meta-refresh with delay=0 is queued as an async task, so the inline rule
 * execution completes synchronously before any iframe navigation fires.
 */
export type RuleActResult = {
  violations: SerializedViolation[];
  inapplicable: boolean;
};

export async function runRuleByActId(
  page: Page,
  actRuleId: string,
  html: string,
): Promise<RuleActResult> {
  await page.setContent(HOST_HTML, { waitUntil: "domcontentloaded" });
  return page.evaluate(
    ({ actId, html, iifeText }) => {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
      iframe.style.cssText = "width:1024px;height:768px;border:0";
      document.body.appendChild(iframe);
      const cdoc = iframe.contentDocument;
      if (!cdoc) throw new Error("iframe contentDocument unavailable");

      cdoc.open();
      cdoc.write(html);
      cdoc.close();
      // Inject the IIFE into <head> after parsing so it doesn't pollute
      // <body> — some rules care about body's direct children (e.g. the
      // SVG/MathML-root check in readable/html-has-lang).
      const script = cdoc.createElement("script");
      script.textContent = iifeText;
      (cdoc.head ?? cdoc.documentElement).appendChild(script);
      // Force style+layout so scrollHeight/clientHeight/getBoundingClientRect
      // values are populated for layout-sensitive rules.
      void cdoc.body?.getBoundingClientRect();

      const iwin = iframe.contentWindow as
        | (Window & { AccessLint?: AccessLintBrowserGlobal })
        | null;
      if (!iwin?.AccessLint) throw new Error("AccessLint missing in iframe realm");
      iwin.AccessLint.clearAllCaches();
      const matching = iwin.AccessLint.rules.filter((r) => r.actRuleIds?.includes(actId));
      if (matching.length === 0) return { violations: [], inapplicable: false };
      const violations = matching.flatMap((r) => r.run(cdoc));
      // Inapplicable: no violations AND every rule with an applicable() guard
      // reports the document is out of scope. Rules without applicable() are
      // treated as always applicable (conservative).
      const withGuard = matching.filter((r) => typeof r.applicable === "function");
      const inapplicable =
        violations.length === 0 &&
        withGuard.length > 0 &&
        withGuard.every((r) => !r.applicable!(cdoc));
      return { violations, inapplicable };
    },
    { actId: actRuleId, html, iifeText: IIFE_TEXT },
  );
}
