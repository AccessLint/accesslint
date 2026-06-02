import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * On-disk record of a Chrome instance this package launched, keyed by debug
 * port. Persisting it is what lets a later `stop` — a different process from the
 * one that launched — find the pid and throwaway profile to clean up.
 */
export interface ChromeState {
  pid: number;
  port: number;
  userDataDir: string;
  startedAt: string;
}

const DIR = join(tmpdir(), "accesslint-chrome");
const file = (port: number) => join(DIR, `${port}.json`);

export function writeState(state: ChromeState): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file(state.port), JSON.stringify(state, null, 2) + "\n");
}

export function readState(port: number): ChromeState | null {
  try {
    return JSON.parse(readFileSync(file(port), "utf8")) as ChromeState;
  } catch {
    return null;
  }
}

export function removeState(port: number): void {
  rmSync(file(port), { force: true });
}

export function listStates(): ChromeState[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((n) => n.endsWith(".json"))
    .map((n) => {
      try {
        return JSON.parse(readFileSync(join(DIR, n), "utf8")) as ChromeState;
      } catch {
        return null;
      }
    })
    .filter((s): s is ChromeState => s !== null);
}
