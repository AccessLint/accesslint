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
      "Inject @accesslint/core into the page via CDN. Set false on repeat audits where the IIFE is already loaded. Pages with strict CSP should use audit_live instead.",
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
  source_map: z
    .enum(["off", "fiber"])
    .optional()
    .default("fiber")
    .describe(
      "Attach React DevTools fiber source locations to violations. 'fiber' (default) works in dev builds; no-op otherwise. 'off' skips it.",
    ),
};

export function registerAuditBrowserScript(server: McpServer): void {
  server.tool(
    "audit_browser_script",
    "Returns a JS snippet for your browser MCP's evaluate tool (e.g. mcp__chrome-devtools__evaluate_script). Use when auditing the user's existing browser session; otherwise prefer audit_live which auto-launches Chrome. Pass the result to audit_browser_collect.",
    auditBrowserScriptSchema,
    async ({ inject, name, include_aaa, disabled_rules, rules, wcag, component_mode, locale, source_map }) => {
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
          sourceMap: source_map,
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
        `as the function argument. Then pass the raw JSON result to ${collectHint}.\n\n` +
        `If you don't have a browser MCP connected, prefer audit_live (direct CDP) — ` +
        `it requires Chrome started with --remote-debugging-port=9222 (or ACCESSLINT_CDP_ENDPOINT set) ` +
        `but skips the paste-and-evaluate dance. If neither is set up, ask the user to install ` +
        `chrome-devtools-mcp (\`claude mcp add chrome-devtools npx -- -y chrome-devtools-mcp@latest\`) ` +
        `or start Chrome with the debug flag — don't paste a script that has nowhere to run.`;

      return {
        content: [
          { type: "text", text: instruction },
          { type: "text", text: "```js\n" + script + "\n```" },
        ],
      };
    },
  );
}
