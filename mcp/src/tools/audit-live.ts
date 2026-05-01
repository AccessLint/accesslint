import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { runLiveAudit } from "../lib/cdp.js";
import { storeAudit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { computeDisabledRules } from "../lib/filters.js";

export const auditLiveSchema = {
  url: z
    .string()
    .url()
    .describe("URL to audit. If a tab matching this URL is already open, it'll be reused; otherwise a new tab is created."),
  cdp_endpoint: z
    .string()
    .optional()
    .describe(
      'Override the CDP endpoint. Accepts "host:port" or "http://host:port". Defaults to 127.0.0.1:9222 (or ACCESSLINT_CDP_ENDPOINT / ACCESSLINT_CDP_PORT env vars).',
    ),
  attach_existing: z
    .boolean()
    .optional()
    .describe(
      "Require a pre-existing tab matching the URL — fail rather than open a new one. Use when an upstream browser MCP has set up the page state.",
    ),
  wait_for: z
    .string()
    .optional()
    .describe(
      "Selector or visible text to wait for after navigation (e.g. '#main', 'Welcome'). Polls until present or wait_timeout_ms elapses.",
    ),
  wait_timeout_ms: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Max wait for wait_for to appear, in milliseconds. Default 10000."),
  name: z.string().optional().describe('Store result for later diffing (e.g. "before")'),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
  format: z
    .enum(["verbose", "compact"])
    .optional()
    .describe("Output verbosity. 'compact' fits one violation per line; default 'verbose'."),
  rules: z.array(z.string()).optional().describe("Allow-list of rule IDs to run"),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Allow-list of WCAG criteria to run (e.g. ["1.4.3", "2.4.4"])'),
  include_aaa: z.boolean().optional().describe("Include WCAG AAA-level rules in the audit"),
  component_mode: z
    .boolean()
    .optional()
    .describe("Treat the page as a component fragment (skip page-level rules like html-has-lang)"),
  locale: z.string().optional().describe('Locale for rule messages (e.g. "en", "es")'),
  source_map: z
    .enum(["off", "fiber"])
    .optional()
    .describe(
      "Attach React DevTools fiber source locations to violations. 'fiber' (default) is a no-op on non-React or production builds. 'off' skips it.",
    ),
};

export function registerAuditLive(server: McpServer): void {
  server.tool(
    "audit_live",
    "Audit a live URL by attaching directly to Chrome via CDP. Loads @accesslint/core into the page through Runtime.evaluate (CSP-bypassing, no CDN fetch from the page) and runs the audit. Requires Chrome running with --remote-debugging-port=9222 (or set ACCESSLINT_CDP_ENDPOINT). Use this instead of audit_browser_script + audit_browser_collect when a CDP endpoint is reachable; the IIFE bytes don't pass through the agent.",
    auditLiveSchema,
    async ({
      url,
      cdp_endpoint,
      attach_existing,
      wait_for,
      wait_timeout_ms,
      name,
      min_impact,
      format,
      rules,
      wcag,
      include_aaa,
      component_mode,
      locale,
      source_map,
    }) => {
      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });

      const outcome = await runLiveAudit({
        url,
        cdpEndpoint: cdp_endpoint,
        attachExisting: attach_existing,
        waitFor: wait_for,
        waitTimeoutMs: wait_timeout_ms,
        sourceMap: source_map,
        coreOptions: {
          disabledRules,
          includeAAA: include_aaa,
          componentMode: component_mode,
          locale,
        },
      });

      if (!outcome.ok) {
        return {
          content: [{ type: "text", text: `Error: ${outcome.error}` }],
          isError: true,
        };
      }

      if (name) {
        storeAudit(name, outcome.result);
      }

      return {
        content: [
          {
            type: "text",
            text: formatViolations(outcome.result.violations, {
              minImpact: min_impact,
              format,
            }),
          },
        ],
      };
    },
  );
}
