import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";

export const auditHtmlSchema = {
  html: z.string().describe("HTML to audit for accessibility violations"),
  name: z
    .string()
    .optional()
    .describe('Store result for later diffing (e.g. "before")'),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
};

export function registerAuditHtml(server: McpServer): void {
  server.tool(
    "audit_html",
    "Audit an HTML string for accessibility violations. Auto-detects fragments vs full documents.",
    auditHtmlSchema,
    async ({ html, name, min_impact }) => {
      const check = checkHtmlSize(html);
      if (!check.ok) {
        return {
          content: [{ type: "text", text: `Error: ${check.error}` }],
          isError: true,
        };
      }
      const result = audit(html, { name });
      return {
        content: [{ type: "text", text: formatViolations(result.violations, { minImpact: min_impact }) }],
      };
    }
  );
}
