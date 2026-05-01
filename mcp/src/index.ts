import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
      "REQUIREMENT: live-page accessibility audits need Chrome reachable in one of two ways — (1) Chrome started with --remote-debugging-port=9222 (or ACCESSLINT_CDP_ENDPOINT set), which enables the audit_live tool, or (2) a browser MCP installed alongside this one (chrome-devtools-mcp recommended; playwright-mcp / puppeteer-mcp also work), which enables the audit_browser_script + audit_browser_collect pair. Without either, only audit_html (raw HTML strings) is available — live-DOM coverage (SPA content, real contrast, post-mount ARIA) is lost. If the user gives a URL and you can't reach a live-DOM path, tell them what to install before falling back. When a violation includes a 'Browser hint', use your browser tools (screenshot, inspect) to follow the hint. To audit React components (.jsx/.tsx) without a running app, use the audit-react-component prompt.",
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
