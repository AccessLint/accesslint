import { z } from "zod";
import { createHash } from "node:crypto";
import { diffAudit, type AuditResult, type DiffResult } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit, getStoredAudit, storeAudit } from "../lib/state.js";
import { formatDiff, formatViolations } from "../lib/format.js";
import { checkHtmlSize } from "../lib/limits.js";
import { computeDisabledRules, filterViolationsByWcag } from "../lib/filters.js";
import { auditFileResolved } from "./audit-file.js";
import { auditUrlFetch } from "./audit-url.js";

export const auditDiffSchema = {
  // Exactly one source must be supplied:
  path: z.string().optional().describe("File path (relative or absolute, jailed to workspace root)"),
  html: z.string().optional().describe("HTML string"),
  url: z.string().url().optional().describe("URL to fetch and audit"),
  audit_name: z
    .string()
    .optional()
    .describe(
      "Name of an already-stored audit (e.g. from audit_browser_collect). Diffs against the prior baseline for that name.",
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

function baselineKey(args: {
  path?: string;
  html?: string;
  url?: string;
  audit_name?: string;
  resolvedPath?: string;
}): string {
  if (args.audit_name) return `__baseline:name:${args.audit_name}`;
  if (args.resolvedPath) return `__baseline:path:${args.resolvedPath}`;
  if (args.url) {
    try {
      return `__baseline:url:${new URL(args.url).toString()}`;
    } catch {
      return `__baseline:url:${args.url}`;
    }
  }
  if (args.html != null) {
    const hash = createHash("sha1").update(args.html).digest("hex").slice(0, 16);
    return `__baseline:html:${hash}`;
  }
  throw new Error("baselineKey: no source provided");
}

export function registerAuditDiff(server: McpServer): void {
  server.tool(
    "audit_diff",
    "Audit a target and compare against an automatically-managed baseline. First call returns the audit and stores it as the baseline; subsequent calls return only the diff. Use to verify fixes during an edit loop.",
    auditDiffSchema,
    async ({
      path,
      html,
      url,
      audit_name,
      format,
      rules,
      wcag,
      min_impact,
      include_aaa,
      component_mode,
    }) => {
      const sources = [path, html, url, audit_name].filter((v) => v !== undefined);
      if (sources.length !== 1) {
        return {
          content: [
            {
              type: "text",
              text: "Error: provide exactly one of path / html / url / audit_name.",
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

      let newResult: AuditResult;
      let key: string;

      if (audit_name) {
        const existing = getStoredAudit(audit_name);
        if (!existing) {
          return {
            content: [
              {
                type: "text",
                text: `No stored audit named "${audit_name}". Call audit_browser_collect (or audit_html with a name) first.`,
              },
            ],
            isError: true,
          };
        }
        newResult = existing;
        key = baselineKey({ audit_name });
      } else if (path !== undefined) {
        const outcome = await auditFileResolved(path, {
          includeAAA: include_aaa,
          componentMode: component_mode,
          disabledRules,
        });
        if (!outcome.ok) {
          return {
            content: [{ type: "text", text: `Error reading file: ${outcome.error}` }],
            isError: true,
          };
        }
        newResult = outcome.result;
        key = baselineKey({ path, resolvedPath: outcome.resolvedPath });
      } else if (url !== undefined) {
        const outcome = await auditUrlFetch(url, {
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
        newResult = outcome.result;
        key = baselineKey({ url });
      } else {
        // html
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
        key = baselineKey({ html: html! });
      }

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
