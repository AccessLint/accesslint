import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAuditHtml } from "./tools/audit-html.js";
import { registerAuditLive } from "./tools/audit-live.js";
import { registerListRules } from "./tools/list-rules.js";
import { registerExplainRule } from "./tools/explain-rule.js";
import { registerAuditReactComponentPrompt } from "./prompts/audit-react-component.js";
import { stopLaunchedChrome } from "./lib/cli-runner.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const server = new McpServer(
  {
    name: "accesslint",
    version,
  },
  {
    instructions:
      "For URL audits use audit_live — it ensures a debuggable Chrome (auto-launching one headless via @accesslint/chrome if none is reachable, no manual setup needed), then runs the @accesslint/core engine against the live DOM. For raw HTML strings or files, use audit_html (Read the file first, then pass the string). To audit React components (.jsx/.tsx) without a running app, use the audit-react-component prompt. Use list_rules and explain_rule for rule metadata. To diff a page against a baseline, use the accesslint diff skill (on-disk snapshots), not this server.",
  },
);

registerAuditHtml(server);
registerAuditLive(server);
registerListRules(server);
registerExplainRule(server);
registerAuditReactComponentPrompt(server);

// Best-effort teardown: stop only the Chrome we launched. Registering a signal
// handler suppresses Node's default termination, so we must exit explicitly.
// (Plain `process.on('exit')` runs synchronously and can't await the stop, so
// we don't hook it — @accesslint/chrome's `ensure` reuse is the real backstop.)
const teardown = (): void => {
  void stopLaunchedChrome().finally(() => process.exit(0));
};
process.once("SIGINT", teardown);
process.once("SIGTERM", teardown);

const transport = new StdioServerTransport();
await server.connect(transport);
