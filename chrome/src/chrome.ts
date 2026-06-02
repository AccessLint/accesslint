import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Launcher } from "chrome-launcher";
import { listStates, readState, removeState, writeState, type ChromeState } from "./state.js";

/**
 * @accesslint/chrome — ensure a Chrome the CDP HTTP discovery API can drive.
 *
 * Two ideas carry the whole package:
 *
 * 1. Chrome must outlive the launcher. Our consumer is a one-shot `npx` call, so
 *    we spawn Chrome *detached* and record its pid/profile to a state file; a
 *    later `stop` reads that file to tear it down. (This is why we don't use
 *    chrome-launcher's `launch()` — it ties Chrome to the calling process. We
 *    use chrome-launcher only for cross-platform binary discovery.)
 *
 * 2. "Driveable" means HTTP discovery answers, never just TCP-open. A
 *    DevTools-checkbox / chrome-devtools-mcp Chrome holds the port but serves
 *    only a WebSocket, which `chrome-remote-interface` (and thus the CLI) can't
 *    use. So we probe `/json/version`, and if a port is TCP-busy but undriveable
 *    we step to the next free one.
 */

const HOST = "127.0.0.1"; // CDP debugging is local-only in practice
const DEFAULT_PORT = 9222;
const LAUNCH_READY_TIMEOUT_MS = 12_000;

export interface EnsureOptions {
  port?: number;
  headed?: boolean;
}

export interface EnsureResult {
  ok: true;
  /** "attached" = a driveable Chrome was already there; "launched" = we started one. */
  mode: "attached" | "launched";
  host: string;
  port: number;
  /** Browser version from /json/version, e.g. "Chrome/130.0...". */
  browser?: string;
  /** Present for launched instances — what `stop` acts on. */
  pid?: number;
  /** True when we own the instance's lifecycle (we launched it). */
  managed: boolean;
}

export interface StoppedInstance {
  port: number;
  pid: number;
}

interface DiscoveryInfo {
  Browser?: string;
}

export function resolvePort(opts: EnsureOptions = {}): number {
  if (opts.port !== undefined) return opts.port;
  if (process.env.ACCESSLINT_CDP_PORT) return Number(process.env.ACCESSLINT_CDP_PORT);
  return DEFAULT_PORT;
}

/** The only signal that means "the CLI can drive this Chrome." */
async function discovery(port: number): Promise<DiscoveryInfo | null> {
  try {
    const res = await fetch(`http://${HOST}:${port}/json/version`, { signal: AbortSignal.timeout(1000) });
    return res.ok ? ((await res.json()) as DiscoveryInfo) : null;
  } catch {
    return null;
  }
}

/** Bare TCP liveness — tells "free port" apart from "occupied but undriveable." */
function tcpOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: HOST, port });
    const done = (r: boolean) => (socket.destroy(), resolve(r));
    socket.setTimeout(600);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

/** First bindable port at or after `preferred` (skips checkbox-mode squatters). */
async function freePort(preferred: number): Promise<number> {
  for (let port = preferred; port < preferred + 10; port++) {
    if (!(await tcpOpen(port))) return port;
  }
  throw new Error(`No free port in ${preferred}..${preferred + 9}. Free one or pass --port.`);
}

/** A Chrome we launched that still answers discovery; prunes dead records as it scans. */
async function managedAlive(): Promise<{ state: ChromeState; info: DiscoveryInfo } | null> {
  for (const state of listStates()) {
    const info = await discovery(state.port);
    if (info) return { state, info };
    removeState(state.port);
  }
  return null;
}

/**
 * Get-or-launch a driveable Chrome. Idempotent: attaches to one already serving
 * discovery on the requested port, or — when no port was pinned — to one we
 * already manage, rather than launching a second.
 *
 * When a port is pinned (explicit `port` or ACCESSLINT_CDP_PORT) and held by a
 * process that doesn't answer discovery, ensure fails rather than stepping to
 * another port: the caller asked for that exact port, so silently moving would
 * leave them pointed at the wrong one. Only an unpinned request steps past a
 * squatter to the next free port.
 */
export async function ensure(opts: EnsureOptions = {}): Promise<EnsureResult> {
  const port = resolvePort(opts);
  const pinned = opts.port !== undefined || process.env.ACCESSLINT_CDP_PORT !== undefined;

  const existing = await discovery(port);
  if (existing) return { ok: true, mode: "attached", host: HOST, port, browser: existing.Browser, managed: false };

  if (pinned) {
    if (await tcpOpen(port)) {
      throw new Error(
        `Port ${port} is held by a process that doesn't serve CDP discovery ` +
          `(likely a DevTools-checkbox or chrome-devtools-mcp Chrome). ` +
          `Free it, or pick another port with --port.`,
      );
    }
    return launchOn(port, opts.headed);
  }

  const reuse = await managedAlive();
  if (reuse) {
    const { state, info } = reuse;
    return { ok: true, mode: "attached", host: HOST, port: state.port, browser: info.Browser, pid: state.pid, managed: true };
  }

  return launchOn(await freePort(port), opts.headed);
}

async function launchOn(port: number, headed?: boolean): Promise<EnsureResult> {
  const userDataDir = mkdtempSync(join(tmpdir(), "accesslint-chrome-profile-"));
  const flags = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`, // required: Chrome won't expose port debugging on the default profile
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ];
  if (!headed) flags.unshift("--headless=new");

  const child = spawn(locateChrome(), flags, { detached: true, stdio: "ignore" });
  child.unref();
  const pid = child.pid;
  if (pid === undefined) {
    rmSync(userDataDir, { recursive: true, force: true });
    throw new Error("Failed to spawn Chrome (no pid).");
  }

  const info = await waitForDiscovery(port);
  if (!info) {
    killTree(pid);
    rmSync(userDataDir, { recursive: true, force: true });
    throw new Error(`Launched Chrome (pid ${pid}) but discovery never answered on ${HOST}:${port}.`);
  }

  writeState({ pid, port, userDataDir, startedAt: new Date().toISOString() });
  return { ok: true, mode: "launched", host: HOST, port, browser: info.Browser, pid, managed: true };
}

/** Tear down instances we launched (one port, or `all`), cleaning up profiles. */
export async function stop(opts: { port?: number; all?: boolean } = {}): Promise<StoppedInstance[]> {
  const targets = opts.all ? listStates() : [readState(resolvePort(opts))].filter((s): s is ChromeState => s !== null);

  const stopped: StoppedInstance[] = [];
  for (const state of targets) {
    killTree(state.pid);
    // Let Chrome finish exiting before reclaiming the profile, or it races our
    // delete and rewrites lock/version files into a stale directory.
    await waitForExit(state.pid);
    rmSync(state.userDataDir, { recursive: true, force: true });
    removeState(state.port);
    stopped.push({ port: state.port, pid: state.pid });
  }
  return stopped;
}

function locateChrome(): string {
  // chrome-launcher honors CHROME_PATH and searches platform-specific locations.
  const found = Launcher.getFirstInstallation();
  if (!found) throw new Error("No Chrome/Chromium found. Set CHROME_PATH or install Chrome.");
  return found;
}

async function waitForDiscovery(port: number): Promise<DiscoveryInfo | null> {
  const deadline = Date.now() + LAUNCH_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = await discovery(port);
    if (info) return info;
    await sleep(200);
  }
  return null;
}

function killTree(pid: number): void {
  // Detached children lead their own process group, so a negative pid signals
  // the whole group (Chrome + renderers). Fall back to the bare pid.
  try {
    process.kill(-pid);
  } catch {
    try {
      process.kill(pid);
    } catch {
      /* already gone */
    }
  }
}

async function waitForExit(pid: number, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0); // existence check
    } catch {
      return; // gone
    }
    await sleep(50);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
