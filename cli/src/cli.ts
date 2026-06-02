#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { resolveInput } from "./input.js";
import { audit } from "./audit.js";
import { format } from "./format.js";
import { runLiveAudit } from "./cdp.js";

function isURL(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

const main = defineCommand({
  meta: {
    name: "accesslint",
    version: "0.1.0",
    description: "Audit HTML for accessibility violations",
  },
  args: {
    source: {
      type: "positional",
      description: "HTML file path, URL, or pipe via stdin",
      required: false,
    },
    format: {
      type: "string",
      alias: "f",
      description: "Output format: text, json",
      default: "text",
    },
    pretty: {
      type: "boolean",
      description: "Pretty-print json output (default: single line)",
      default: false,
    },
    "include-aaa": {
      type: "boolean",
      description: "Include AAA-level rules",
      default: false,
    },
    disable: {
      type: "string",
      alias: "d",
      description: "Comma-separated rule IDs to disable",
    },
    port: {
      type: "string",
      alias: "p",
      description: "CDP port to connect to (URL audits only, default: 9222)",
    },
    host: {
      type: "string",
      description: "CDP host (URL audits only, default: 127.0.0.1)",
    },
    "wait-for": {
      type: "string",
      description: "Selector or visible text to wait for before auditing (URL only)",
    },
    "wait-timeout": {
      type: "string",
      description: "Max ms to wait for --wait-for (default: 10000)",
    },
    attach: {
      type: "boolean",
      description: "Only attach to an existing tab matching the URL; fail if not found",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const disabledRules = args.disable
        ? args.disable.split(",").map((s: string) => s.trim())
        : undefined;

      if (args.source && isURL(args.source)) {
        const outcome = await runLiveAudit({
          url: args.source,
          host: args.host,
          port: args.port ? Number(args.port) : undefined,
          attachExisting: args.attach,
          waitFor: args["wait-for"],
          waitTimeoutMs: args["wait-timeout"] ? Number(args["wait-timeout"]) : undefined,
          coreOptions: {
            includeAAA: args["include-aaa"],
            disabledRules,
          },
        });

        if (!outcome.ok) {
          console.error(`Error: ${outcome.error}`);
          process.exit(2);
        }

        console.log(format(outcome.result, args.format, args.pretty));
        process.exit(outcome.result.violations.length > 0 ? 1 : 0);
      }

      const html = await resolveInput(args.source);
      const result = audit(html, {
        includeAAA: args["include-aaa"],
        disabledRules,
      });

      console.log(format(result, args.format, args.pretty));
      process.exit(result.violations.length > 0 ? 1 : 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(2);
    }
  },
});

runMain(main);
