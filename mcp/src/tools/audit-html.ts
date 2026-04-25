import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";
import { computeDisabledRules } from "../lib/filters.js";

export const auditHtmlSchema = {
  html: z.string().describe("HTML to audit for accessibility violations"),
  name: z.string().optional().describe('Store result for later diffing (e.g. "before")'),
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
  include_aaa: z
    .boolean()
    .optional()
    .describe("Include WCAG AAA-level rules in the audit"),
  component_mode: z
    .boolean()
    .optional()
    .describe("Treat the page as a component fragment (skip page-level rules like html-has-lang)"),
};

export function registerAuditHtml(server: McpServer): void {
  server.tool(
    "audit_html",
    "Audit an HTML string for accessibility violations. Auto-detects fragments vs full documents.",
    auditHtmlSchema,
    async ({ html, name, min_impact, format, rules, wcag, include_aaa, component_mode }) => {
      const check = checkHtmlSize(html);
      if (!check.ok) {
        return {
          content: [{ type: "text", text: `Error: ${check.error}` }],
          isError: true,
        };
      }
      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });
      const result = audit(html, {
        name,
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
    },
  );
}
