import { z } from "zod";
import { getActiveRules } from "@accesslint/core";
import type { Rule } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatRuleTable } from "../lib/format.js";

export const listRulesSchema = {
  category: z
    .string()
    .optional()
    .describe('Filter by category slug (e.g. "aria", "text-alternatives")'),
  level: z
    .enum(["A", "AA", "AAA"])
    .optional()
    .describe("Filter by WCAG level"),
  fixability: z
    .enum(["mechanical", "contextual", "visual"])
    .optional()
    .describe("Filter by fixability"),
  wcag: z
    .string()
    .optional()
    .describe('Filter by WCAG criterion (e.g. "1.1.1")'),
};

export function registerListRules(server: McpServer): void {
  server.tool(
    "list_rules",
    "List available accessibility rules with optional filters by category, WCAG level, fixability, or criterion.",
    listRulesSchema,
    async ({ category, level, fixability, wcag }) => {
      let filtered: Rule[] = getActiveRules();

      if (category) {
        filtered = filtered.filter((r) => r.category === category);
      }
      if (level) {
        filtered = filtered.filter((r) => r.level === level);
      }
      if (fixability) {
        filtered = filtered.filter((r) => r.fixability === fixability);
      }
      if (wcag) {
        filtered = filtered.filter((r) => r.wcag.includes(wcag));
      }

      return {
        content: [{ type: "text", text: formatRuleTable(filtered) }],
      };
    }
  );
}
