import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";

export const auditFileSchema = {
  path: z
    .string()
    .describe("Path to HTML file (absolute, or relative to cwd)"),
  name: z
    .string()
    .optional()
    .describe('Store result for later diffing (e.g. "before")'),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
};

export function registerAuditFile(server: McpServer): void {
  server.tool(
    "audit_file",
    "Read an HTML file from disk and audit it for accessibility violations.",
    auditFileSchema,
    async ({ path, name, min_impact }) => {
      const resolved = resolve(path);
      let html: string;
      try {
        html = await readFile(resolved, "utf-8");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error reading file";
        return {
          content: [{ type: "text", text: `Error reading file: ${message}` }],
          isError: true,
        };
      }

      const baseURL = pathToFileURL(resolved).href;
      const processedHtml = await inlineCSS(html, baseURL);
      const result = audit(processedHtml, { name });
      return {
        content: [{ type: "text", text: formatViolations(result.violations, { minImpact: min_impact }) }],
      };
    }
  );
}
