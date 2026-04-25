import { z } from "zod";
import { getRuleById } from "@accesslint/core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const explainRuleSchema = {
  id: z
    .string()
    .describe("Rule ID, e.g. 'text-alternatives/img-alt'. Discover IDs via list_rules."),
};

export function registerExplainRule(server: McpServer): void {
  server.tool(
    "explain_rule",
    "Return detailed metadata for a single rule: description, WCAG criteria, level, fixability, browser hint, and remediation guidance.",
    explainRuleSchema,
    async ({ id }) => {
      const rule = getRuleById(id);
      if (!rule) {
        return {
          content: [
            {
              type: "text",
              text: `Unknown rule "${id}". Use list_rules to discover available IDs.`,
            },
          ],
          isError: true,
        };
      }

      const lines: string[] = [
        `${rule.id}`,
        `  Description: ${rule.description}`,
        `  WCAG: ${rule.wcag.join(", ")}`,
        `  Level: ${rule.level}`,
      ];
      if (rule.fixability) lines.push(`  Fixability: ${rule.fixability}`);
      if (rule.tags && rule.tags.length > 0) lines.push(`  Tags: ${rule.tags.join(", ")}`);
      if (rule.actRuleIds && rule.actRuleIds.length > 0) {
        lines.push(`  ACT rules: ${rule.actRuleIds.join(", ")}`);
      }
      if (rule.browserHint) lines.push(`  Browser hint: ${rule.browserHint}`);
      if (rule.guidance) lines.push("", `  Guidance: ${rule.guidance}`);

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
