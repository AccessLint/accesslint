import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuditResult } from "@accesslint/core";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { safeFetch, BlockedUrlError, FetchLimitError } from "@accesslint/cli/safe-fetch";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { computeDisabledRules } from "../lib/filters.js";

// MCP is driven by an agent that may be influenced by untrusted page content,
// so private/loopback network targets are blocked by default. Operators on a
// local dev machine can opt in via env var.
const allowPrivateNetwork = process.env.ACCESSLINT_ALLOW_PRIVATE_NETWORK === "1";

const PRIMARY_MAX_BYTES = 10 * 1024 * 1024;
const PRIMARY_TIMEOUT_MS = 15_000;

export interface AuditUrlOptions {
  name?: string;
  includeAAA?: boolean;
  componentMode?: boolean;
  disabledRules?: string[];
}

export interface AuditUrlSuccess {
  ok: true;
  result: AuditResult;
}
export interface AuditUrlFailure {
  ok: false;
  error: string;
}

export async function auditUrlFetch(
  url: string,
  options: AuditUrlOptions = {},
): Promise<AuditUrlSuccess | AuditUrlFailure> {
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
    return { ok: false, error: message };
  }

  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status} ${response.statusText}` };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    await response.body?.cancel().catch(() => {});
    return { ok: false, error: `Expected HTML but received content-type "${contentType}"` };
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
    return { ok: false, error: message };
  }

  const processedHtml = await inlineCSS(html, url, { allowPrivateNetwork });
  const result = audit(processedHtml, options);
  return { ok: true, result };
}

export const auditUrlSchema = {
  url: z.string().url().describe("URL to fetch and audit"),
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
    .describe('Allow-list of WCAG criteria to run (e.g. ["1.4.3"])'),
  include_aaa: z.boolean().optional(),
  component_mode: z.boolean().optional(),
};

export function registerAuditUrl(server: McpServer): void {
  server.tool(
    "audit_url",
    "Fetch a URL and audit the returned HTML for accessibility violations.",
    auditUrlSchema,
    async ({ url, name, min_impact, format, rules, wcag, include_aaa, component_mode }) => {
      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });
      const outcome = await auditUrlFetch(url, {
        name,
        includeAAA: include_aaa,
        componentMode: component_mode,
        disabledRules,
      });
      if (!outcome.ok) {
        return {
          content: [{ type: "text", text: `Error fetching URL: ${outcome.error}` }],
          isError: true,
        };
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
