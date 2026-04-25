import { z } from "zod";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuditResult } from "@accesslint/core";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { MAX_HTML_BYTES } from "../lib/limits.js";
import { computeDisabledRules } from "../lib/filters.js";

// Restrict file reads to a workspace root (symlinks resolved) so prompt-injected
// MCP calls can't exfiltrate arbitrary files from the host.
const allowPrivateNetwork = process.env.ACCESSLINT_ALLOW_PRIVATE_NETWORK === "1";

function getWorkspaceRoot(): string {
  return resolve(process.env.ACCESSLINT_WORKSPACE_ROOT ?? process.cwd());
}

export async function resolveWithinWorkspace(inputPath: string): Promise<string> {
  const root = await realpath(getWorkspaceRoot());
  const candidate = resolve(root, inputPath);
  let real: string;
  try {
    real = await realpath(candidate);
  } catch {
    // File doesn't exist yet — let readFile produce the ENOENT, but still jail the candidate.
    real = candidate;
  }
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (real !== root && !real.startsWith(rootWithSep)) {
    throw new Error(`Path is outside workspace root (${root})`);
  }
  return real;
}

export interface AuditFileOptions {
  name?: string;
  includeAAA?: boolean;
  componentMode?: boolean;
  disabledRules?: string[];
}

export interface AuditFileSuccess {
  ok: true;
  result: AuditResult;
  resolvedPath: string;
}
export interface AuditFileFailure {
  ok: false;
  error: string;
}

/**
 * Resolve, validate, read, inline CSS, and audit an HTML file. Shared between
 * audit_file and audit_diff so both honor the same workspace jail and limits.
 */
export async function auditFileResolved(
  path: string,
  options: AuditFileOptions = {},
): Promise<AuditFileSuccess | AuditFileFailure> {
  let resolved: string;
  try {
    resolved = await resolveWithinWorkspace(path);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown path error" };
  }

  try {
    const st = await stat(resolved);
    if (st.size > MAX_HTML_BYTES) {
      return {
        ok: false,
        error: `size ${st.size} exceeds ${MAX_HTML_BYTES} bytes`,
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error reading file" };
  }

  let html: string;
  try {
    html = await readFile(resolved, "utf-8");
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error reading file" };
  }

  const baseURL = pathToFileURL(resolved).href;
  const processedHtml = await inlineCSS(html, baseURL, { allowPrivateNetwork });
  const result = audit(processedHtml, options);
  return { ok: true, result, resolvedPath: resolved };
}

export const auditFileSchema = {
  path: z
    .string()
    .describe("Path to HTML file (relative to workspace root, or absolute but must be inside it)"),
  name: z.string().optional().describe('Store result for later diffing (e.g. "before")'),
  min_impact: z
    .enum(["critical", "serious", "moderate", "minor"])
    .optional()
    .describe("Only show violations at this severity or above"),
  format: z
    .enum(["verbose", "compact"])
    .optional()
    .describe("Output verbosity. 'compact' fits one violation per line; default 'verbose'."),
  rules: z
    .array(z.string())
    .optional()
    .describe('Allow-list of rule IDs to run'),
  wcag: z
    .array(z.string())
    .optional()
    .describe('Allow-list of WCAG criteria to run (e.g. ["1.4.3"])'),
  include_aaa: z.boolean().optional(),
  component_mode: z.boolean().optional(),
};

export function registerAuditFile(server: McpServer): void {
  server.tool(
    "audit_file",
    "Read an HTML file from disk and audit it for accessibility violations.",
    auditFileSchema,
    async ({ path, name, min_impact, format, rules, wcag, include_aaa, component_mode }) => {
      const disabledRules = computeDisabledRules({
        rules,
        wcag,
        includeAAA: include_aaa,
      });
      const outcome = await auditFileResolved(path, {
        name,
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
      return {
        content: [
          {
            type: "text",
            text: formatViolations(outcome.result.violations, { minImpact: min_impact, format }),
          },
        ],
      };
    },
  );
}
