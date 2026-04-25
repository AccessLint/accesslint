import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildBrowserScript, newSessionToken } from "../lib/browser-script.js";
import { registerExpectedToken } from "../lib/state.js";
import { computeDisabledRules } from "../lib/filters.js";

export const auditBrowserScriptSchema = {
  inject: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Bootstrap window.AccessLint by fetching the @accesslint/core IIFE from cdn.jsdelivr.net and evaluating it in-page. The bootstrap is ~1 KB; the IIFE is no longer inlined. Set false for repeat audits on the same page where the IIFE is already loaded. Note: pages with strict CSP may block the CDN fetch; fall back to static audit_html / audit_file in that case.",
    ),
  name: z
    .string()
    .optional()
    .describe(
      "Token to pair with audit_browser_collect for storage and diffing. The script embeds a session token; collect verifies it.",
    ),
  include_aaa: z
    .boolean()
    .optional()
    .describe("Include WCAG AAA-level rules in the audit"),
  disabled_rules: z
    .array(z.string())
    .optional()
    .describe('List of rule IDs to skip (e.g. ["text-alternatives/img-alt"])'),
  rules: z
    .array(z.string())
    .optional()
    .describe("Allow-list of rule IDs to run (inverse of disabled_rules)"),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Allow-list of WCAG criteria to run (e.g. ["1.4.3", "2.4.4"])'),
  component_mode: z
    .boolean()
    .optional()
    .describe("Treat the page as a component fragment (skip page-level rules like html-has-lang)"),
  locale: z.string().optional().describe('Locale for rule messages (e.g. "en", "es")'),
};

export function registerAuditBrowserScript(server: McpServer): void {
  server.tool(
    "audit_browser_script",
    "Returns a JS function expression to paste into your browser MCP's evaluate tool (e.g. mcp__chrome-devtools__evaluate_script). The script audits the live page using @accesslint/core; pass the result back to audit_browser_collect.",
    auditBrowserScriptSchema,
    async ({ inject, name, include_aaa, disabled_rules, rules, wcag, component_mode, locale }) => {
      const sessionToken = newSessionToken();
      if (name) {
        registerExpectedToken(name, sessionToken);
      }

      const mergedDisabled = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
        existingDisabled: disabled_rules,
      });

      let script: string;
      try {
        script = buildBrowserScript({
          inject,
          sessionToken,
          coreOptions: {
            includeAAA: include_aaa,
            disabledRules: mergedDisabled,
            componentMode: component_mode,
            locale,
          },
        });
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }

      const collectHint = name
        ? `audit_browser_collect with name="${name}"`
        : "audit_browser_collect";

      const instruction =
        `Pass the script below to your browser MCP's evaluate tool ` +
        `(chrome-devtools-mcp: evaluate_script, playwright-mcp: browser_evaluate, etc.) ` +
        `as the function argument. Then pass the raw JSON result to ${collectHint}.`;

      return {
        content: [
          { type: "text", text: instruction },
          { type: "text", text: "```js\n" + script + "\n```" },
        ],
      };
    },
  );
}
