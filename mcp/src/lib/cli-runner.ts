import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { AuditResult } from "@accesslint/core";

/**
 * All subprocess interaction lives here. The MCP owns no Chrome/CDP/audit
 * engine of its own — it shells out to the `@accesslint/chrome` and
 * `@accesslint/cli` binaries (the same path the scan/diff skills use) and
 * formats what they return.
 *
 * Bins are resolved straight out of the installed dependencies and run with
 * the current `node` — no `npx`. The skills use `npx @latest` only because
 * they have no installed dependency to point at; the MCP does, so this pins
 * the audit engine to the exact versions it was published against and skips
 * npx resolution latency.
 */

const require = createRequire(import.meta.url);

const CHROME_TIMEOUT_MS = 30_000;
const SCAN_TIMEOUT_MS = 60_000;

/**
 * Absolute path to a dependency's named bin script (e.g. cli → dist/cli.js).
 *
 * These packages' `exports` maps don't expose `./package.json`, so we can't
 * `require.resolve("<pkg>/package.json")` directly. Resolve the package's main
 * entry instead and walk up to the directory that holds its package.json.
 */
function resolveBin(pkg: string, binName: string): string {
  let dir = dirname(require.resolve(pkg));
  let pkgJsonPath: string | undefined;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, "package.json");
    if (existsSync(candidate)) {
      pkgJsonPath = candidate;
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!pkgJsonPath) throw new Error(`Could not locate package.json for ${pkg}`);
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
    bin?: Record<string, string> | string;
  };
  const bin = pkgJson.bin;
  const rel = typeof bin === "string" ? bin : bin?.[binName];
  if (!rel) throw new Error(`${pkg} has no bin "${binName}"`);
  return resolve(dirname(pkgJsonPath), rel);
}

interface RunOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
}

function run(
  binPath: string,
  args: string[],
  timeoutMs: number,
  input?: string,
): Promise<RunOutcome> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      stdio: [input !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Timed out after ${timeoutMs}ms running ${binPath}`));
    }, timeoutMs);

    child.stdout!.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr!.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });

    if (input !== undefined && child.stdin) {
      child.stdin.on("error", () => {
        /* child may exit before draining stdin; the close/exit handler reports it */
      });
      child.stdin.end(input);
    }
  });
}

export interface EnsureChromeOptions {
  port?: number;
  host?: string;
}

export interface ChromeEndpoint {
  host: string;
  port: number;
  managed: boolean;
}

interface ChromeEnsureJson {
  ok: boolean;
  host?: string;
  port?: number;
  managed?: boolean;
  error?: string;
}

// The one managed instance whose lifecycle we own, if we launched it.
let launchedPort: number | null = null;

/**
 * Get-or-launch a driveable Chrome via `accesslint-chrome ensure`. Idempotent:
 * a second call attaches to the running instance rather than launching another
 * (the chrome package keeps a state file), so calling it before every audit is
 * cheap.
 */
export async function ensureChrome(opts: EnsureChromeOptions = {}): Promise<ChromeEndpoint> {
  const bin = resolveBin("@accesslint/chrome", "accesslint-chrome");
  const args = ["ensure"];
  if (opts.port !== undefined) args.push("--port", String(opts.port));

  const { code, stdout, stderr } = await run(bin, args, CHROME_TIMEOUT_MS);

  let parsed: ChromeEnsureJson | undefined;
  try {
    parsed = JSON.parse(stdout.trim()) as ChromeEnsureJson;
  } catch {
    /* fall through to the error below */
  }
  if (!parsed || parsed.ok !== true || parsed.port === undefined) {
    const detail = parsed?.error ?? (stderr.trim() || `exit ${code}`);
    throw new Error(`Could not start a debuggable Chrome: ${detail}`);
  }

  if (parsed.managed) launchedPort = parsed.port;
  return { host: parsed.host ?? "127.0.0.1", port: parsed.port, managed: Boolean(parsed.managed) };
}

/** Stop the Chrome we launched (if any). Best-effort. */
export async function stopLaunchedChrome(): Promise<void> {
  if (launchedPort === null) return;
  const port = launchedPort;
  launchedPort = null;
  const bin = resolveBin("@accesslint/chrome", "accesslint-chrome");
  try {
    await run(bin, ["stop", "--port", String(port)], CHROME_TIMEOUT_MS);
  } catch {
    /* hygiene, not correctness — chrome's `ensure` reuse is the real backstop */
  }
}

export interface ScanUrlOptions {
  host?: string;
  port: number;
  waitFor?: string;
  waitTimeoutMs?: number;
  selector?: string;
  includeAAA?: boolean;
  disabledRules?: string[];
}

/**
 * Audit a live URL via `accesslint scan <url> --port ... --format json`.
 *
 * `scan` exits 1 when violations are found, 0 when none, and 2 on a real error.
 * Both 0 and 1 carry the full AuditResult on stdout, so only exit 2 (or
 * unparseable stdout) is treated as a failure.
 */
export async function scanUrl(url: string, opts: ScanUrlOptions): Promise<AuditResult> {
  const bin = resolveBin("@accesslint/cli", "accesslint");
  // `accesslint scan <url> [flags]` — subcommand first, then the positional.
  const args = ["scan", url, "--format", "json", "--port", String(opts.port)];
  if (opts.host) args.push("--host", opts.host);
  if (opts.waitFor) args.push("--wait-for", opts.waitFor);
  if (opts.waitTimeoutMs !== undefined) args.push("--wait-timeout", String(opts.waitTimeoutMs));
  if (opts.selector) args.push("--selector", opts.selector);
  if (opts.includeAAA) args.push("--include-aaa");
  if (opts.disabledRules && opts.disabledRules.length > 0) {
    args.push("--disable", opts.disabledRules.join(","));
  }

  const { code, stdout, stderr } = await run(bin, args, SCAN_TIMEOUT_MS);

  if (code === 2 || code === null) {
    const detail = stderr.replace(/^Error:\s*/, "").trim() || `exit ${code}`;
    throw new Error(detail);
  }

  try {
    return JSON.parse(stdout.trim()) as AuditResult;
  } catch (err) {
    throw new Error(
      `Could not parse scan output (exit ${code}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export interface ScanHtmlOptions {
  host?: string;
  port: number;
  includeAAA?: boolean;
  componentMode?: boolean;
  disabledRules?: string[];
  selector?: string;
}

/**
 * Audit an HTML string via `accesslint scan --stdin --port ... --format json`,
 * piping the HTML to the CLI's stdin. The CLI loads it into a blank Chrome tab
 * (Page.setDocumentContent) and audits the real DOM — same exit-code contract as
 * scanUrl (0/1 carry the result, 2 is a real error).
 */
export async function scanHtml(html: string, opts: ScanHtmlOptions): Promise<AuditResult> {
  const bin = resolveBin("@accesslint/cli", "accesslint");
  const args = ["scan", "--stdin", "--format", "json", "--port", String(opts.port)];
  if (opts.host) args.push("--host", opts.host);
  if (opts.selector) args.push("--selector", opts.selector);
  if (opts.includeAAA) args.push("--include-aaa");
  if (opts.componentMode) args.push("--component-mode");
  if (opts.disabledRules && opts.disabledRules.length > 0) {
    args.push("--disable", opts.disabledRules.join(","));
  }

  const { code, stdout, stderr } = await run(bin, args, SCAN_TIMEOUT_MS, html);

  if (code === 2 || code === null) {
    const detail = stderr.replace(/^Error:\s*/, "").trim() || `exit ${code}`;
    throw new Error(detail);
  }

  try {
    return JSON.parse(stdout.trim()) as AuditResult;
  } catch (err) {
    throw new Error(
      `Could not parse scan output (exit ${code}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
