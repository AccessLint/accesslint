import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ensureChrome, scanHtml } from "../lib/cli-runner.js";
import { formatViolations } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";
import { computeDisabledRules } from "../lib/filters.js";

export const auditHtmlSchema = {
  html: z.string().describe("HTML to audit for accessibility violations"),
  port: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "CDP port to attach to / launch on. Defaults to 9222 or ACCESSLINT_CDP_PORT. Omit for auto-detection.",
    ),
  host: z.string().optional().describe("CDP host. Defaults to 127.0.0.1."),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
  format: z
    .enum(["verbose", "compact"])
    .optional()
    .describe("Output verbosity. 'compact' fits one violation per line; default 'verbose'."),
  rules: z
    .array(z.string())
    .optional()
    .describe('Allow-list of rule IDs to run (e.g. ["text-alternatives/img-alt"])'),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Allow-list of WCAG criteria to run (e.g. ["1.4.3", "2.4.4"])'),
  include_aaa: z.boolean().optional().describe("Include WCAG AAA-level rules in the audit"),
  component_mode: z
    .boolean()
    .optional()
    .describe(
      "Treat the page as a component fragment (skip page-level rules like html-has-lang). Auto-detected from the markup when omitted.",
    ),
};

export function registerAuditHtml(server: McpServer): void {
  server.tool(
    "audit_html",
    "Audit an HTML string for accessibility violations. Ensures a debuggable Chrome (auto-launches one headless if none is reachable), loads the HTML into a blank tab, and runs the @accesslint/core engine against the real DOM. Auto-detects fragments vs full documents.",
    auditHtmlSchema,
    async ({ html, port, host, min_impact, format, rules, wcag, include_aaa, component_mode }) => {
      const check = checkHtmlSize(html);
      if (!check.ok) {
        return {
          content: [{ type: "text", text: `Error: ${check.error}` }],
          isError: true,
        };
      }
      const disabledRules = computeDisabledRules({ rules, wcag, includeAAA: include_aaa });

      try {
        const endpoint = await ensureChrome({ port, host });
        const result = await scanHtml(html, {
          host: endpoint.host,
          port: endpoint.port,
          includeAAA: include_aaa,
          componentMode: component_mode,
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
