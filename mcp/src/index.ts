import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { registerAuditHtml } from "./tools/audit-html.js";
import { registerAuditBrowserScript } from "./tools/audit-browser-script.js";
import { registerAuditBrowserCollect } from "./tools/audit-browser-collect.js";
import { registerAuditLive } from "./tools/audit-live.js";
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
      "For live-URL audits prefer audit_live — it auto-launches Chrome minimized if no debug session is reachable, so no manual setup is needed. Fall back to audit_browser_script + audit_browser_collect only when a browser MCP is available and the user needs their existing browser session. When a violation includes a 'Browser hint', use your browser tools (screenshot, inspect) to follow the hint. To audit React components (.jsx/.tsx) without a running app, use the audit-react-component prompt.",
  },
);

registerAuditHtml(server);
registerAuditBrowserScript(server);
registerAuditBrowserCollect(server);
registerAuditLive(server);
registerDiffHtml(server);
registerListRules(server);
registerAuditDiff(server);
registerQuickCheck(server);
registerExplainRule(server);
registerAuditReactComponentPrompt(server);
registerAuditLivePagePrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
