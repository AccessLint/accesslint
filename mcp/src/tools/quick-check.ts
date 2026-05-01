import { z } from "zod";
import type { AuditResult, Violation } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit, getStoredAudit } from "../lib/state.js";
import { checkHtmlSize } from "../lib/limits.js";
import { computeDisabledRules, filterViolationsByWcag } from "../lib/filters.js";

export const quickCheckSchema = {
  html: z.string().optional().describe("HTML string to summarize"),
  audit_name: z
    .string()
    .optional()
    .describe("Name of an already-stored audit to summarize (e.g. from audit_live)"),
  rules: z.array(z.string()).optional(),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Restrict to these WCAG criteria (e.g. ["1.4.3"])'),
  include_aaa: z.boolean().optional(),
  component_mode: z.boolean().optional(),
};

function summarize(violations: Violation[]): string {
  if (violations.length === 0) return "PASS — 0 violations";
  const counts: Record<string, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) {
    if (v.impact in counts) counts[v.impact]++;
  }
  const parts: string[] = [];
  for (const key of ["critical", "serious", "moderate", "minor"]) {
    if (counts[key] > 0) parts.push(`${counts[key]} ${key}`);
  }
  return `FAIL — ${violations.length} violation${violations.length === 1 ? "" : "s"}: ${parts.join(", ")}`;
}

export function registerQuickCheck(server: McpServer): void {
  server.tool(
    "quick_check",
    "Pass/fail accessibility summary in one line. Use as a fast probe during a fix loop ('am I clean yet?'). Does not store anything.",
    quickCheckSchema,
    async ({ html, audit_name, rules, wcag, include_aaa, component_mode }) => {
      const sources = [html, audit_name].filter((v) => v !== undefined);
      if (sources.length !== 1) {
        return {
          content: [
            {
              type: "text",
              text: "Error: provide exactly one of html / audit_name.",
            },
          ],
          isError: true,
        };
      }

      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });

      let result: AuditResult;
      if (audit_name) {
        const existing = getStoredAudit(audit_name);
        if (!existing) {
          return {
            content: [{ type: "text", text: `No stored audit named "${audit_name}".` }],
            isError: true,
          };
        }
        result = existing;
      } else {
        const check = checkHtmlSize(html!);
        if (!check.ok) {
          return {
            content: [{ type: "text", text: `Error: ${check.error}` }],
            isError: true,
          };
        }
        result = audit(html!, {
          includeAAA: include_aaa,
          componentMode: component_mode,
          disabledRules,
        });
      }

      const violations =
        wcag && wcag.length > 0 ? filterViolationsByWcag(result.violations, wcag) : result.violations;
      return { content: [{ type: "text", text: summarize(violations) }] };
    },
  );
}
