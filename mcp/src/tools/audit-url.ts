import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";

export const auditUrlSchema = {
  url: z.string().url().describe("URL to fetch and audit"),
  name: z
    .string()
    .optional()
    .describe('Store result for later diffing (e.g. "before")'),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
};

export function registerAuditUrl(server: McpServer): void {
  server.tool(
    "audit_url",
    "Fetch a URL and audit the returned HTML for accessibility violations.",
    auditUrlSchema,
    async ({ url, name, min_impact }) => {
      let response: Response;
      try {
        response = await fetch(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown network error";
        return {
          content: [{ type: "text", text: `Error fetching URL: ${message}` }],
          isError: true,
        };
      }

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching URL: HTTP ${response.status} ${response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Expected HTML but received content-type "${contentType}"`,
            },
          ],
          isError: true,
        };
      }

      const html = await response.text();
      const processedHtml = await inlineCSS(html, url);
      const result = audit(processedHtml, { name });
      return {
        content: [
          {
            type: "text",
            text: formatViolations(result.violations, {
              minImpact: min_impact,
            }),
          },
        ],
      };
    }
  );
}
