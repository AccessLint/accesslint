import { z } from "zod";
import { createHash } from "node:crypto";
import { diffAudit, type AuditResult, type DiffResult } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit, getStoredAudit, storeAudit } from "../lib/state.js";
import { formatDiff, formatViolations } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";
import { computeDisabledRules, filterViolationsByWcag } from "../lib/filters.js";

export const auditDiffSchema = {
  // Exactly one source must be supplied:
  html: z.string().optional().describe("HTML string to audit"),
  audit_name: z
    .string()
    .optional()
    .describe(
      "Name of an already-stored audit (e.g. from audit_live or audit_browser_collect).",
    ),

  // Optional explicit baseline:
  before: z
    .string()
    .optional()
    .describe(
      "Name of a stored audit to diff against. When provided, skips the auto-managed baseline and compares the source directly against this audit. Use after running an audit with `name` to capture the 'before' state.",
    ),

  // Filters / output:
  format: z.enum(["verbose", "compact"]).optional(),
  rules: z.array(z.string()).optional().describe("Allow-list of rule IDs to run"),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Allow-list of WCAG criteria to run / filter (e.g. ["1.4.3"])'),
  min_impact: z.enum(["critical", "serious", "moderate", "minor"]).optional(),
  include_aaa: z.boolean().optional(),
  component_mode: z.boolean().optional(),
};

function autoBaselineKey(args: { html?: string; audit_name?: string }): string {
  if (args.audit_name) return `__baseline:name:${args.audit_name}`;
  if (args.html != null) {
    const hash = createHash("sha1").update(args.html).digest("hex").slice(0, 16);
    return `__baseline:html:${hash}`;
  }
  throw new Error("autoBaselineKey: no source provided");
}

export function registerAuditDiff(server: McpServer): void {
  server.tool(
    "audit_diff",
    "Audit a target and compare against a baseline. With just html/audit_name: auto-managed baseline — first call stores, subsequent calls diff. With `before` set: explicit baseline — diffs against the named stored audit, no auto-storage. For live URLs, run audit_live with a name first.",
    auditDiffSchema,
    async ({
      html,
      audit_name,
      before,
      format,
      rules,
      wcag,
      min_impact,
      include_aaa,
      component_mode,
    }) => {
      const sources = [html, audit_name].filter((v) => v !== undefined);
      if (sources.length !== 1) {
        return {
          content: [
            { type: "text", text: "Error: provide exactly one of html / audit_name." },
          ],
          isError: true,
        };
      }

      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });

      let newResult: AuditResult;

      if (audit_name) {
        const existing = getStoredAudit(audit_name);
        if (!existing) {
          return {
            content: [
              {
                type: "text",
                text: `No stored audit named "${audit_name}". Call audit_live, audit_browser_collect, or audit_html (with a name) first.`,
              },
            ],
            isError: true,
          };
        }
        newResult = existing;
      } else {
        const check = checkHtmlSize(html!);
        if (!check.ok) {
          return {
            content: [{ type: "text", text: `Error: ${check.error}` }],
            isError: true,
          };
        }
        newResult = audit(html!, {
          includeAAA: include_aaa,
          componentMode: component_mode,
          disabledRules,
        });
      }

      // Explicit-baseline path: diff against a named stored audit.
      if (before !== undefined) {
        const beforeResult = getStoredAudit(before);
        if (!beforeResult) {
          return {
            content: [
              {
                type: "text",
                text: `No stored audit named "${before}". Run an audit with name="${before}" first to capture the baseline.`,
              },
            ],
            isError: true,
          };
        }
        let diff: DiffResult = diffAudit(beforeResult, newResult);
        if (wcag && wcag.length > 0) {
          diff = {
            added: filterViolationsByWcag(diff.added, wcag),
            fixed: filterViolationsByWcag(diff.fixed, wcag),
            unchanged: filterViolationsByWcag(diff.unchanged, wcag),
          };
        }
        return {
          content: [{ type: "text", text: formatDiff(diff, { minImpact: min_impact, format }) }],
        };
      }

      // Auto-managed baseline path.
      const key = autoBaselineKey({ html, audit_name });
      const prior = getStoredAudit(key);
      storeAudit(key, newResult);

      if (!prior) {
        const filtered =
          wcag && wcag.length > 0
            ? filterViolationsByWcag(newResult.violations, wcag)
            : newResult.violations;
        const text =
          "Baseline established.\n\n" +
          formatViolations(filtered, { minImpact: min_impact, format });
        return { content: [{ type: "text", text }] };
      }

      let diff: DiffResult = diffAudit(prior, newResult);
      if (wcag && wcag.length > 0) {
        diff = {
          added: filterViolationsByWcag(diff.added, wcag),
          fixed: filterViolationsByWcag(diff.fixed, wcag),
          unchanged: filterViolationsByWcag(diff.unchanged, wcag),
        };
      }
      return {
        content: [{ type: "text", text: formatDiff(diff, { minImpact: min_impact, format }) }],
      };
    },
  );
}
