import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { ensureChrome, scanHtml, stopLaunchedChrome } from "../src/lib/cli-runner.js";

/**
 * The real subprocess path: resolve the installed CLI and Chrome bins, launch
 * a browser, and audit through them.
 *
 * tests/cli-runner.test.ts mocks `node:child_process` outright, so it proves
 * the argv we build and nothing about whether the binaries run. That gap is
 * how AccessLint/skills#8 shipped: every audit tool failed on Windows because
 * the CLI it shells out to could not load its own engine, and no test ever
 * started a process to find out.
 *
 * Runs as the `integration` project so `bun run test` stays fast and
 * browser-free.
 */

const HTML = '<html lang="en"><head><title>t</title></head><body><img src="a.png"></body></html>';

const coreVersion = (
  JSON.parse(readFileSync(new URL("../../core/package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

afterAll(async () => {
  await stopLaunchedChrome();
});

describe("cli-runner against real binaries", () => {
  it("audits HTML end to end through the CLI subprocess", async () => {
    const endpoint = await ensureChrome();
    expect(endpoint.port).toBeGreaterThan(0);

    const result = await scanHtml(HTML, { host: endpoint.host, port: endpoint.port });

    // A wrong or unloadable engine surfaces here rather than as a violation
    // count, which is what made the Windows failure so hard to read.
    expect(result.testEngine.version).toBe(coreVersion);
    expect(result.ruleCount).toBeGreaterThan(0);
    expect(result.violations.map((v) => v.ruleId)).toContain("text-alternatives/img-alt");
  }, 120_000);

  it("honours a rule allow-list across the version boundary", async () => {
    const endpoint = await ensureChrome();

    const result = await scanHtml(HTML, {
      host: endpoint.host,
      port: endpoint.port,
      disabledRules: ["text-alternatives/img-alt"],
    });

    // Leaks here mean the MCP's rule list and the engine's disagree, which is
    // what a mismatched second copy of @accesslint/core produces.
    expect(result.violations.map((v) => v.ruleId)).not.toContain("text-alternatives/img-alt");
  }, 120_000);
});
