import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ensureChrome, scanUrl } from "../lib/cli-runner.js";
import { formatViolations } from "../lib/format.js";
import { computeDisabledRules } from "../lib/filters.js";

export const auditLiveSchema = {
  url: z
    .string()
    .url()
    .describe("URL to audit. Reuses an existing tab matching this URL; opens a new one otherwise."),
  port: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "CDP port to attach to / launch on. Defaults to 9222 or ACCESSLINT_CDP_PORT. Omit for auto-detection.",
    ),
  host: z.string().optional().describe("CDP host. Defaults to 127.0.0.1."),
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
    .describe("Max ms to wait for wait_for / selector. Default 10000."),
  selector: z
    .string()
    .optional()
    .describe(
      "CSS selector to scope the audit to; auto-waits for the element, then reports only violations inside it.",
    ),
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
};

export function registerAuditLive(server: McpServer): void {
  server.tool(
    "audit_live",
    "Audit a live URL via CDP. Ensures a debuggable Chrome (auto-launches one headless via @accesslint/chrome if none is reachable — no manual setup needed), then runs the @accesslint/core engine against the live DOM. CSP-bypassing. Use this for any URL audit.",
    auditLiveSchema,
    async ({
      url,
      port,
      host,
      wait_for,
      wait_timeout_ms,
      selector,
      min_impact,
      format,
      rules,
      wcag,
      include_aaa,
    }) => {
      const disabledRules = computeDisabledRules({ rules, wcag, includeAAA: include_aaa });

      try {
        const endpoint = await ensureChrome({ port, host });
        const result = await scanUrl(url, {
          host: endpoint.host,
          port: endpoint.port,
          waitFor: wait_for,
          waitTimeoutMs: wait_timeout_ms,
          selector,
          includeAAA: include_aaa,
          disabledRules,
        });

        return {
          content: [
            {
              type: "text",
              text: formatViolations(result.violations, { minImpact: min_impact, format }),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` },
          ],
          isError: true,
        };
      }
    },
  );
}
