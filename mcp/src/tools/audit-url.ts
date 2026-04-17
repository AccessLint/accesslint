import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { safeFetch, BlockedUrlError, FetchLimitError } from "@accesslint/cli/safe-fetch";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";

// MCP is driven by an agent that may be influenced by untrusted page content,
// so private/loopback network targets are blocked by default. Operators on a
// local dev machine can opt in via env var.
const allowPrivateNetwork = process.env.ACCESSLINT_ALLOW_PRIVATE_NETWORK === "1";

const PRIMARY_MAX_BYTES = 10 * 1024 * 1024;
const PRIMARY_TIMEOUT_MS = 15_000;

export const auditUrlSchema = {
  url: z.string().url().describe("URL to fetch and audit"),
  name: z.string().optional().describe('Store result for later diffing (e.g. "before")'),
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
        response = await safeFetch(url, {
          allowPrivateNetwork,
          maxBytes: PRIMARY_MAX_BYTES,
          timeoutMs: PRIMARY_TIMEOUT_MS,
        });
      } catch (err) {
        const message =
          err instanceof BlockedUrlError || err instanceof FetchLimitError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown network error";
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
        await response.body?.cancel().catch(() => {});
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

      let html: string;
      try {
        html = await response.text();
      } catch (err) {
        const message =
          err instanceof FetchLimitError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error reading response";
        return {
          content: [{ type: "text", text: `Error fetching URL: ${message}` }],
          isError: true,
        };
      }

      const processedHtml = await inlineCSS(html, url, { allowPrivateNetwork });
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
    },
  );
}
