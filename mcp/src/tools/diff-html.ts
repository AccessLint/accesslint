import { z } from "zod";
import { diffAudit } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit, getStoredAudit } from "../lib/state.js";
import { formatDiff } from "../lib/format.js";

export const diffHtmlSchema = {
  html: z.string().describe("Updated HTML to audit and compare"),
  before: z
    .string()
    .describe("Name passed to a prior audit_html call (must run audit_html with this name first)"),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
};

export function registerDiffHtml(server: McpServer): void {
  server.tool(
    "diff_html",
    "Audit new HTML and diff against a previously named audit. Use after audit_html with a name to verify fixes.",
    diffHtmlSchema,
    async ({ html, before, min_impact }) => {
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
      const diff = diffAudit(beforeResult, afterResult);
      return {
        content: [{ type: "text", text: formatDiff(diff, { minImpact: min_impact }) }],
      };
    }
  );
}
