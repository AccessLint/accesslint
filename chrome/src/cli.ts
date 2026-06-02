#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { ensure, stop } from "./chrome.js";

const port = { type: "string" as const, alias: "p", description: "CDP port to attach to / launch on (default 9222)" };

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value) + "\n");
}

const ensureCmd = defineCommand({
  meta: { name: "ensure", description: "Get-or-launch a driveable Chrome; print its CDP endpoint as JSON" },
  args: {
    port,
    headed: { type: "boolean", description: "Launch a visible Chrome instead of headless", default: false },
    download: {
      type: "boolean",
      description: "If no system Chrome is found, download a managed Chrome for Testing",
      default: false,
    },
  },
  async run({ args }) {
    try {
      print(await ensure({ port: args.port ? Number(args.port) : undefined, headed: args.headed, download: args.download }));
    } catch (err) {
      print({ ok: false, error: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    }
  },
});

const stopCmd = defineCommand({
  meta: { name: "stop", description: "Kill a managed Chrome and clean up its profile" },
  args: {
    port,
    all: { type: "boolean", description: "Stop every managed instance", default: false },
  },
  async run({ args }) {
    print({ ok: true, stopped: await stop({ port: args.port ? Number(args.port) : undefined, all: args.all }) });
  },
});

runMain(
  defineCommand({
    meta: { name: "accesslint-chrome", description: "Ensure and manage a debuggable Chrome for AccessLint live audits" },
    subCommands: { ensure: ensureCmd, stop: stopCmd },
  }),
);
