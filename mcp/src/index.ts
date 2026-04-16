import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuditHtml } from "./tools/audit-html.js";
import { registerAuditFile } from "./tools/audit-file.js";
import { registerAuditUrl } from "./tools/audit-url.js";
import { registerDiffHtml } from "./tools/diff-html.js";
import { registerListRules } from "./tools/list-rules.js";
import { registerAuditReactComponentPrompt } from "./prompts/audit-react-component.js";

const server = new McpServer(
  {
    name: "accesslint",
    version: "0.1.0",
  },
  {
    instructions: "When a violation includes a 'Browser hint', use your browser tools (e.g. screenshot, inspect) to follow the hint and improve your fix. To audit React components (.jsx/.tsx), use the audit-react-component prompt for guidance on rendering them to HTML first.",
  },
);

registerAuditHtml(server);
registerAuditFile(server);
registerAuditUrl(server);
registerDiffHtml(server);
registerListRules(server);
registerAuditReactComponentPrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);
