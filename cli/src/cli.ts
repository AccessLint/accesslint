#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { resolveInput } from "./input.js";
import { audit } from "./audit.js";
import { format } from "./format.js";

const main = defineCommand({
  meta: {
    name: "accesslint",
    version: "0.1.0",
    description: "Audit HTML for accessibility violations",
  },
  args: {
    source: {
      type: "positional",
      description: "HTML file path or URL to audit (or pipe via stdin)",
      required: false,
    },
    format: {
      type: "string",
      alias: "f",
      description: "Output format: text, json",
      default: "text",
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
  },
  async run({ args }) {
    try {
      const html = await resolveInput(args.source);
      const disabledRules = args.disable
        ? args.disable.split(",").map((s: string) => s.trim())
        : undefined;

      const result = audit(html, {
        includeAAA: args["include-aaa"],
        disabledRules,
      });

      console.log(format(result, args.format));
      process.exitCode = result.violations.length > 0 ? 1 : 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exitCode = 2;
    }
  },
});

runMain(main);
