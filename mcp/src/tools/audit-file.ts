import { z } from "zod";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { inlineCSS } from "@accesslint/cli/inline-css";
import { audit } from "../lib/state.js";
import { formatViolations } from "../lib/format.js";
import { MAX_HTML_BYTES } from "../lib/limits.js";

// Restrict file reads to a workspace root (symlinks resolved) so prompt-injected
// MCP calls can't exfiltrate arbitrary files from the host.
const allowPrivateNetwork = process.env.ACCESSLINT_ALLOW_PRIVATE_NETWORK === "1";

function getWorkspaceRoot(): string {
  return resolve(process.env.ACCESSLINT_WORKSPACE_ROOT ?? process.cwd());
}

async function resolveWithinWorkspace(inputPath: string): Promise<string> {
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

export const auditFileSchema = {
  path: z
    .string()
    .describe("Path to HTML file (relative to workspace root, or absolute but must be inside it)"),
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
      let resolved: string;
      try {
        resolved = await resolveWithinWorkspace(path);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown path error";
        return {
          content: [{ type: "text", text: `Error reading file: ${message}` }],
          isError: true,
        };
      }

      try {
        const st = await stat(resolved);
        if (st.size > MAX_HTML_BYTES) {
          return {
            content: [
              {
                type: "text",
                text: `Error reading file: size ${st.size} exceeds ${MAX_HTML_BYTES} bytes`,
              },
            ],
            isError: true,
          };
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error reading file";
        return {
          content: [{ type: "text", text: `Error reading file: ${message}` }],
          isError: true,
        };
      }

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
      const processedHtml = await inlineCSS(html, baseURL, { allowPrivateNetwork });
      const result = audit(processedHtml, { name });
      return {
        content: [{ type: "text", text: formatViolations(result.violations, { minImpact: min_impact }) }],
      };
    }
  );
}
