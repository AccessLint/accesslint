#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { loadAllHistory } from "./history.js";
import { aggregate } from "./aggregate.js";
import { emitJson } from "./emit-json.js";
import { emitMarkdown } from "./emit-md.js";
import { emitHtml } from "./emit-html.js";

const main = defineCommand({
  meta: {
    name: "accesslint-report",
    version: "0.1.0",
    description: "Generate a trend report from @accesslint snapshot history",
  },
  args: {
    dir: {
      type: "string",
      description:
        "Directory containing accessibility-snapshots (default: ./accessibility-snapshots)",
      default: "accessibility-snapshots",
    },
    snapshot: {
      type: "string",
      alias: "s",
      description: "Filter to a single snapshot name",
    },
    format: {
      type: "string",
      alias: "f",
      description: "Output format: json, md, html",
      default: "md",
    },
    out: {
      type: "string",
      alias: "o",
      description: "Write output to file instead of stdout",
    },
  },
  async run({ args }) {
    try {
      const root = resolve(process.cwd(), args.dir);
      const records = loadAllHistory(root);
      const filtered = args.snapshot ? records.filter((r) => r.name === args.snapshot) : records;

      if (filtered.length === 0) {
        console.error(
          `No snapshot history found in ${root}` +
            (args.snapshot ? ` for snapshot "${args.snapshot}"` : "") +
            ". Run your test suite once to seed .history.ndjson.",
        );
        process.exitCode = 1;
        return;
      }

      const report = aggregate(filtered);
      const output = renderFormat(report, args.format);

      if (args.out) {
        writeFileSync(resolve(process.cwd(), args.out), output);
      } else {
        process.stdout.write(output);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exitCode = 2;
    }
  },
});

function renderFormat(report: Parameters<typeof emitJson>[0], format: string): string {
  switch (format) {
    case "json":
      return emitJson(report);
    case "md":
    case "markdown":
      return emitMarkdown(report);
    case "html":
      return emitHtml(report);
    default:
      throw new Error(`Unknown format "${format}" (expected: json, md, html)`);
  }
}

runMain(main);
