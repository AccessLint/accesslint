import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuditHtml } from "./tools/audit-html.js";
import { registerAuditFile } from "./tools/audit-file.js";
import { registerAuditUrl } from "./tools/audit-url.js";
import { registerAuditBrowserScript } from "./tools/audit-browser-script.js";
import { registerAuditBrowserCollect } from "./tools/audit-browser-collect.js";
import { registerDiffHtml } from "./tools/diff-html.js";
import { registerListRules } from "./tools/list-rules.js";
import { registerAuditDiff } from "./tools/audit-diff.js";
import { registerQuickCheck } from "./tools/quick-check.js";
import { registerExplainRule } from "./tools/explain-rule.js";
import { registerAuditReactComponentPrompt } from "./prompts/audit-react-component.js";
import { registerAuditLivePagePrompt } from "./prompts/audit-live-page.js";

const server = new McpServer(
  {
    name: "accesslint",
    version: "0.1.0",
  },
  {
    instructions:
      "When a violation includes a 'Browser hint', use your browser tools (e.g. screenshot, inspect) to follow the hint and improve your fix. To audit React components (.jsx/.tsx), use the audit-react-component prompt. To audit a live SPA / page that needs JS to render, use the audit-live-page prompt — it composes with a browser MCP (chrome-devtools-mcp recommended).",
  },
);

registerAuditHtml(server);
registerAuditFile(server);
registerAuditUrl(server);
registerAuditBrowserScript(server);
registerAuditBrowserCollect(server);
registerDiffHtml(server);
registerListRules(server);
registerAuditDiff(server);
registerQuickCheck(server);
registerExplainRule(server);
registerAuditReactComponentPrompt(server);
registerAuditLivePagePrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
