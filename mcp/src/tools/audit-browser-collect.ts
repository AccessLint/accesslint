import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuditResult, Violation } from "@accesslint/core";
import { consumeExpectedToken, storeAudit } from "../lib/state.js";
import { formatViolations, type Impact } from "../lib/format.js";

export const auditBrowserCollectSchema = {
  raw_result: z
    .string()
    .describe(
      "The JSON the browser-MCP evaluate tool returned. Paste verbatim (the tool will JSON.parse it).",
    ),
  name: z
    .string()
    .optional()
    .describe(
      "Store under this name for later diff_html. Must match the name passed to audit_browser_script.",
    ),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
};

interface InPageResult {
  sessionToken?: string;
  url?: string;
  timestamp?: number;
  ruleCount?: number;
  skippedRules?: { ruleId: string; error: string }[];
  violations?: Violation[];
  error?: string;
}

export type CollectOutcome =
  | { ok: true; text: string; result: AuditResult }
  | { ok: false; text: string };

function parseRawResult(raw: string): InPageResult | { parseError: string } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (err) {
    return {
      parseError: `Could not JSON.parse raw_result: ${
        err instanceof Error ? err.message : String(err)
      }. Make sure you pasted the raw JSON returned by the evaluate tool, not a description of it.`,
    };
  }
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      // Leave as string; the shape check below will reject it.
    }
  }
  if (value === null || typeof value !== "object") {
    return { parseError: `raw_result parsed to ${typeof value}, expected an object` };
  }
  return value as InPageResult;
}

export interface CollectArgs {
  raw_result: string;
  name?: string;
  min_impact?: Impact;
}

export function collectAuditResult(args: CollectArgs): CollectOutcome {
  const parsed = parseRawResult(args.raw_result);
  if ("parseError" in parsed) {
    return { ok: false, text: `Error: ${parsed.parseError}` };
  }

  if (parsed.error) {
    return {
      ok: false,
      text:
        `In-page audit threw an error: ${parsed.error}\n\n` +
        "Common causes: the page reloaded between inject and audit, " +
        "the IIFE wasn't injected (re-run audit_browser_script with inject=true), " +
        "or the browser MCP's evaluate tool stripped the function body.",
    };
  }

  if (args.name) {
    const expected = consumeExpectedToken(args.name);
    if (expected !== undefined && parsed.sessionToken !== expected) {
      return {
        ok: false,
        text:
          `Session token mismatch for name="${args.name}". ` +
          `Expected ${expected}, got ${parsed.sessionToken ?? "<missing>"}. ` +
          `Likely cause: this raw_result is from a different audit_browser_script call. ` +
          `Re-run audit_browser_script and try again.`,
      };
    }
  }

  if (!Array.isArray(parsed.violations)) {
    return {
      ok: false,
      text: `Error: raw_result.violations is missing or not an array (got ${typeof parsed.violations})`,
    };
  }

  const result: AuditResult = {
    url: parsed.url ?? "",
    timestamp: parsed.timestamp ?? Date.now(),
    violations: parsed.violations,
    ruleCount: parsed.ruleCount ?? 0,
    skippedRules: parsed.skippedRules ?? [],
  };

  if (args.name) {
    storeAudit(args.name, result);
  }

  return {
    ok: true,
    text: formatViolations(result.violations, { minImpact: args.min_impact }),
    result,
  };
}

export function registerAuditBrowserCollect(server: McpServer): void {
  server.tool(
    "audit_browser_collect",
    "Parse the JSON returned by your browser MCP's evaluate tool (after running the script from audit_browser_script), store it for later diffing, and format the violations.",
    auditBrowserCollectSchema,
    async ({ raw_result, name, min_impact }) => {
      const outcome = collectAuditResult({ raw_result, name, min_impact });
      return {
        content: [{ type: "text", text: outcome.text }],
        isError: outcome.ok ? undefined : true,
      };
    },
  );
}
