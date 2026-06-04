import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const CONFIG_FILENAME = "accesslint.config.json";
export const LOCAL_CONFIG_FILENAME = "accesslint.config.local.json";

export interface Target {
  url: string;
  selector?: string;
  waitFor?: string;
  includeAAA?: boolean;
  disable?: string[];
  snapshotDir?: string;
}

export interface AccessLintConfig {
  default?: string;
  targets: Record<string, Target>;
}

export function serializeConfig(config: AccessLintConfig): string {
  return JSON.stringify(config, null, 2) + "\n";
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureGitignore(cwd: string, entry: string): Promise<boolean> {
  const path = join(cwd, ".gitignore");
  let current = "";
  try {
    current = await readFile(path, "utf8");
  } catch {
    current = "";
  }
  const lines = current.split(/\r?\n/).map((l) => l.trim());
  if (lines.includes(entry)) return false;
  const needsNewline = current.length > 0 && !current.endsWith("\n");
  const addition = `${needsNewline ? "\n" : ""}# AccessLint local target overrides\n${entry}\n`;
  await writeFile(path, current + addition, "utf8");
  return true;
}

export interface WriteConfigResult {
  wrote: string[];
  gitignoreUpdated: boolean;
}

export async function writeConfigFiles(opts: {
  cwd: string;
  base: AccessLintConfig;
  local?: AccessLintConfig;
  force?: boolean;
}): Promise<WriteConfigResult> {
  const basePath = join(opts.cwd, CONFIG_FILENAME);
  if (!opts.force && (await fileExists(basePath))) {
    throw new Error(
      `${CONFIG_FILENAME} already exists. Re-run with --force to overwrite, or edit it directly.`,
    );
  }

  const wrote: string[] = [];
  await writeFile(basePath, serializeConfig(opts.base), "utf8");
  wrote.push(CONFIG_FILENAME);

  let gitignoreUpdated = false;
  if (opts.local && Object.keys(opts.local.targets).length > 0) {
    await writeFile(join(opts.cwd, LOCAL_CONFIG_FILENAME), serializeConfig(opts.local), "utf8");
    wrote.push(LOCAL_CONFIG_FILENAME);
    gitignoreUpdated = await ensureGitignore(opts.cwd, LOCAL_CONFIG_FILENAME);
  }
  return { wrote, gitignoreUpdated };
}

async function readConfigFile(path: string): Promise<AccessLintConfig | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw) as AccessLintConfig;
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}: ${(err as Error).message}`);
  }
}

export async function loadConfig(cwd: string): Promise<AccessLintConfig | null> {
  const base = await readConfigFile(join(cwd, CONFIG_FILENAME));
  const local = await readConfigFile(join(cwd, LOCAL_CONFIG_FILENAME));
  if (!base && !local) return null;
  return {
    default: local?.default ?? base?.default,
    targets: { ...(base?.targets ?? {}), ...(local?.targets ?? {}) },
  };
}

export type ResolvedTarget = Target & { name: string };

export function selectTarget(
  config: AccessLintConfig | null,
  source: string | undefined,
): ResolvedTarget | null {
  if (!config) return null;
  const names = Object.keys(config.targets);

  if (source !== undefined) {
    if (config.targets[source]) return { name: source, ...config.targets[source] };
    if (/^[a-zA-Z0-9_-]+$/.test(source) && names.length > 0) {
      throw new Error(`Unknown target "${source}". Available targets: ${names.join(", ")}`);
    }
    return null;
  }

  if (config.default) {
    const target = config.targets[config.default];
    if (target) return { name: config.default, ...target };
  }
  return null;
}
