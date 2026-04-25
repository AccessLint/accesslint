import { z } from "zod";
import { diffAudit, type DiffResult } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit, getStoredAudit } from "../lib/state.js";
import { formatDiff } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";
import { filterViolationsByWcag } from "../lib/filters.js";

export const diffHtmlSchema = {
  html: z.string().describe("Updated HTML to audit and compare"),
  before: z
    .string()
    .describe("Name passed to a prior audit_html call (must run audit_html with this name first)"),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
  format: z
    .enum(["verbose", "compact"])
    .optional()
    .describe("Output verbosity. 'compact' fits one violation per line; default 'verbose'."),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Only include violations whose rule maps to these WCAG criteria (e.g. ["1.4.3"])'),
};

export function registerDiffHtml(server: McpServer): void {
  server.tool(
    "diff_html",
    "Audit new HTML and diff against a previously named audit. Use after audit_html with a name to verify fixes.",
    diffHtmlSchema,
    async ({ html, before, min_impact, format, wcag }) => {
      const check = checkHtmlSize(html);
      if (!check.ok) {
        return {
          content: [{ type: "text", text: `Error: ${check.error}` }],
          isError: true,
        };
      }
      const beforeResult = getStoredAudit(before);
      if (!beforeResult) {
        return {
          content: [
            {
              type: "text",
              text: `No stored audit named "${before}". Run audit_html with name="${before}" first.`,
            },
          ],
          isError: true,
        };
      }

      const afterResult = audit(html);
      let diff: DiffResult = diffAudit(beforeResult, afterResult);
      if (wcag && wcag.length > 0) {
        diff = {
          added: filterViolationsByWcag(diff.added, wcag),
          fixed: filterViolationsByWcag(diff.fixed, wcag),
          unchanged: filterViolationsByWcag(diff.unchanged, wcag),
        };
      }
      return {
        content: [
          { type: "text", text: formatDiff(diff, { minImpact: min_impact, format }) },
        ],
      };
    },
  );
}
