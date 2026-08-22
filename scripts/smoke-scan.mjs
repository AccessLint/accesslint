#!/usr/bin/env node
/**
 * End-to-end smoke test for the CLI's real audit path: launch a managed
 * Chrome, pipe HTML to `accesslint scan --stdin`, and check the engine both
 * loaded and reported violations.
 *
 * This exists because of issue #4 and AccessLint/skills#8, which were the same
 * Windows path-separator bug in `loadCoreIIFE` surfacing twice. The unit test
 * in cli/src/iife-source.test.ts covers the path arithmetic by injecting
 * `path.win32`, but it feeds in a hand-written string. What actually broke was
 * real `require.resolve` output on a real Windows filesystem, and only running
 * the binary on Windows exercises that.
 *
 * Usage: node scripts/smoke-scan.mjs [--port <n>]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const chromeBin = path.join(repoRoot, "chrome", "dist", "cli.js");
const cliBin = path.join(repoRoot, "cli", "dist", "cli.js");

const portArg = process.argv.indexOf("--port");
const port = portArg === -1 ? 9455 : Number(process.argv[portArg + 1]);

const HTML = '<html lang="en"><head><title>t</title></head><body><img src="a.png"></body></html>';
const EXPECTED_RULE = "text-alternatives/img-alt";

const expectedEngine = JSON.parse(
  readFileSync(path.join(repoRoot, "core", "package.json"), "utf8"),
).version;

function node(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: "utf8", ...opts });
}

function fail(message, detail) {
  console.error(`smoke-scan: ${message}`);
  if (detail) console.error(detail);
  stopChrome();
  process.exit(1);
}

function stopChrome() {
  try {
    execFileSync(process.execPath, [chromeBin, "stop", "--port", String(port)], {
      stdio: "ignore",
    });
  } catch {
    /* best effort; the runner is torn down either way */
  }
}

console.log(`smoke-scan: launching Chrome on port ${port}`);
const ensure = node([chromeBin, "ensure", "--port", String(port)]);
let endpoint;
try {
  endpoint = JSON.parse(ensure.stdout.trim());
} catch {
  fail("could not parse `accesslint-chrome ensure` output", ensure.stdout + ensure.stderr);
}
if (!endpoint.ok) fail("Chrome did not start", JSON.stringify(endpoint));
console.log(`smoke-scan: ${endpoint.browser} on ${endpoint.host}:${endpoint.port}`);

const scan = node([cliBin, "scan", "--stdin", "--format", "json", "--port", String(port)], {
  input: HTML,
});

// `scan` exits 0 with no violations, 1 with violations, 2 on a real error.
if (scan.status === 2 || scan.status === null) {
  fail(`scan failed (exit ${scan.status})`, scan.stderr.trim());
}

let result;
try {
  result = JSON.parse(scan.stdout.trim());
} catch {
  fail(`scan produced unparseable output (exit ${scan.status})`, scan.stdout.slice(0, 500));
}

if (result.testEngine?.version !== expectedEngine) {
  fail(
    `engine version mismatch: scan reported ${result.testEngine?.version}, ` +
      `workspace core is ${expectedEngine}`,
  );
}

if (!result.violations?.some((v) => v.ruleId === EXPECTED_RULE)) {
  fail(
    `expected a ${EXPECTED_RULE} violation`,
    `got: ${(result.violations ?? []).map((v) => v.ruleId).join(", ") || "(none)"}`,
  );
}

console.log(
  `smoke-scan: ok — engine ${result.testEngine.version}, ` +
    `${result.ruleCount} rules, ${result.violations.length} violations`,
);
stopChrome();
