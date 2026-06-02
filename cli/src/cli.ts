#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { defineCommand, runMain } from "citty";
import { resolveInput } from "./input.js";
import { audit } from "./audit.js";
import { format } from "./format.js";
import { runLiveAudit } from "./cdp.js";
import {
  evaluateSnapshot,
  isUpdateMode,
  resolveSnapshotPath,
  validateSnapshotName,
} from "@accesslint/matchers-internal/snapshot";
import type { SnapshotResult } from "@accesslint/matchers-internal/snapshot";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

function isURL(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

const main = defineCommand({
  meta: {
    name: "accesslint",
    version,
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
      description: "CDP port to connect to, e.g. from `npx @accesslint/chrome ensure` (URL audits only, default: 9222)",
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
      description: "Max ms to wait for --wait-for / --selector (default: 10000)",
    },
    selector: {
      type: "string",
      alias: "s",
      description: "CSS selector to scope the audit to; auto-waits for the element (URL only)",
    },
    attach: {
      type: "boolean",
      description: "Only attach to an existing tab matching the URL; fail if not found",
      default: false,
    },
    snapshot: {
      type: "string",
      description: "Snapshot name — capture a baseline and fail only on new violations (URL only)",
    },
    "snapshot-dir": {
      type: "string",
      description: "Directory for snapshot files (default: ./accessibility-snapshots)",
    },
    "update-snapshot": {
      type: "boolean",
      description: "Force-overwrite the snapshot baseline (also triggered by ACCESSLINT_UPDATE=1)",
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
          selector: args.selector,
          coreOptions: {
            includeAAA: args["include-aaa"],
            disabledRules,
          },
        });

        if (!outcome.ok) {
          console.error(`Error: ${outcome.error}`);
          process.exit(2);
        }

        if (args.snapshot) {
          validateSnapshotName(args.snapshot);
          const snapshotPath = resolveSnapshotPath(args.snapshot, args["snapshot-dir"]);
          const snap = evaluateSnapshot(outcome.snapshotViolations, snapshotPath, {
            update: args["update-snapshot"] || isUpdateMode(),
            name: args.snapshot,
          });
          console.log(formatSnapshotResult(snap, args.snapshot));
          process.exit(snap.pass ? 0 : 1);
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

function formatSnapshotResult(snap: SnapshotResult, name: string): string {
  if (!snap.pass) {
    const lines = [
      `Expected no new violations beyond snapshot "${name}", but found ${snap.newViolations.length} new:`,
    ];
    for (const v of snap.newViolations) {
      lines.push(`  ${v.ruleId}: ${v.selector}`);
      const hint = snap.likelyMoved.find((lm) => lm.current.selector === v.selector);
      if (hint) {
        lines.push(`    likely moved from: ${hint.candidate.selector}`);
        lines.push(`    matched on: ${hint.sharedSignals.join(", ")}`);
        lines.push(`    if same: re-run with --update-snapshot or ACCESSLINT_UPDATE=1`);
        lines.push(`    if new: add a data-testid to disambiguate`);
      }
    }
    return lines.join("\n");
  }

  if (snap.created) {
    return `Snapshot "${name}" created. Future runs fail only on new violations.`;
  }

  if (snap.updated) {
    const reasons: string[] = [];
    if (snap.fixedViolations.length > 0) reasons.push(`${snap.fixedViolations.length} fixed`);
    if (snap.healed.length > 0) reasons.push(`${snap.healed.length} healed`);
    if (snap.refreshed.length > 0) reasons.push(`${snap.refreshed.length} refreshed`);
    const verb = snap.fixedViolations.length > 0 ? "ratcheted" : snap.healed.length > 0 ? "updated" : "refreshed";
    const lines = [`Snapshot "${name}" ${verb} (${reasons.join(", ")}).`];
    for (const h of snap.healed) {
      lines.push(`  healed ${h.ruleId} via ${h.tier}: ${h.oldSelector} -> ${h.newSelector}`);
    }
    return lines.join("\n");
  }

  return `Matches snapshot "${name}".`;
}

runMain(main);
