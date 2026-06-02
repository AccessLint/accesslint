#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { defineCommand, runMain } from "citty";
import { auditRoutesDiff } from "./diff.js";
import { renderMarkdown } from "./format.js";

function loadRoutes(path: string): string[] {
  const raw = readFileSync(path, "utf8").trim();
  if (raw.startsWith("[")) return JSON.parse(raw) as string[];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const main = defineCommand({
  meta: {
    name: "accesslint-diff",
    description: "Diff accessibility violations of a set of routes between two builds",
  },
  args: {
    "baseline-url": { type: "string", required: true, description: "Origin serving the baseline build" },
    "candidate-url": { type: "string", required: true, description: "Origin serving the candidate build" },
    routes: { type: "string", required: true, description: "Routes file: JSON array or newline-delimited" },
    "url-template": {
      type: "string",
      required: true,
      description: "Path template with {route}, e.g. /app.html/component/{route}",
    },
    "ready-selector": { type: "string", description: "Selector to await before auditing each route" },
    host: { type: "string" },
    port: { type: "string", description: "CDP port from `accesslint-chrome ensure` (default 9222)" },
    concurrency: { type: "string", description: "Reusable tabs per origin (default 4)" },
    "wait-timeout": { type: "string" },
    "num-shards": { type: "string" },
    "shard-index": { type: "string" },
    "base-label": { type: "string", default: "baseline" },
    out: { type: "string", description: "Write the markdown report to this path" },
    "no-encode": { type: "boolean", default: false, description: "Do not URL-encode {route}" },
  },
  async run({ args }) {
    const routes = loadRoutes(args.routes);
    const encode = !args["no-encode"];
    const template = args["url-template"];
    const urlTemplate = (route: string): string =>
      template.replace("{route}", encode ? encodeURIComponent(route) : route);

    const report = await auditRoutesDiff({
      baselineUrl: args["baseline-url"],
      candidateUrl: args["candidate-url"],
      routes,
      urlTemplate,
      readySelector: args["ready-selector"],
      host: args.host,
      port: args.port ? Number(args.port) : undefined,
      concurrency: args.concurrency ? Number(args.concurrency) : undefined,
      waitTimeoutMs: args["wait-timeout"] ? Number(args["wait-timeout"]) : undefined,
      numShards: args["num-shards"] ? Number(args["num-shards"]) : undefined,
      shardIndex: args["shard-index"] ? Number(args["shard-index"]) : undefined,
      onProgress: (e) => {
        if (e.done % 25 === 0 || e.done === e.total) {
          console.error(`[${e.phase}] ${e.done}/${e.total}`);
        }
      },
    });

    const markdown = renderMarkdown(report, args["base-label"]);
    if (args.out) writeFileSync(args.out, markdown);
    console.log(markdown);
    process.exit(report.totals.newViolations > 0 ? 1 : 0);
  },
});

runMain(main);
