import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { defineCommand } from "citty";
import { inferDefaults, type InferredDefaults, type PackageJsonish } from "./framework.js";
import {
  CONFIG_FILENAME,
  LOCAL_CONFIG_FILENAME,
  writeConfigFiles,
  type AccessLintConfig,
  type Target,
} from "./config.js";

async function readPackageJson(cwd: string): Promise<PackageJsonish | null> {
  try {
    return JSON.parse(await readFile(join(cwd, "package.json"), "utf8")) as PackageJsonish;
  } catch {
    return null;
  }
}

export interface InitAnswers {
  devUrl: string;
  storybookUrl: string | null;
  prodUrl: string | null;
  defaultTarget: string;
}

interface InitFlags {
  devUrl?: string;
  storybook?: boolean;
  skipStorybook?: boolean;
  prodUrl?: string;
  defaultTarget?: string;
}

export function buildConfig(answers: InitAnswers): {
  base: AccessLintConfig;
  local?: AccessLintConfig;
} {
  const targets: Record<string, Target> = { dev: { url: answers.devUrl } };
  if (answers.storybookUrl) targets.storybook = { url: answers.storybookUrl };
  const base: AccessLintConfig = { default: answers.defaultTarget, targets };
  const local = answers.prodUrl ? { targets: { prod: { url: answers.prodUrl } } } : undefined;
  return { base, local };
}

export function resolveAnswers(defaults: InferredDefaults, flags: InitFlags): InitAnswers {
  const includeStorybook = Boolean(flags.storybook) && !flags.skipStorybook;
  return {
    devUrl: flags.devUrl ?? defaults.devUrl,
    storybookUrl: includeStorybook ? defaults.storybook.url : null,
    prodUrl: flags.prodUrl ?? null,
    defaultTarget: flags.defaultTarget ?? "dev",
  };
}

async function promptAnswers(defaults: InferredDefaults, flags: InitFlags): Promise<InitAnswers> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ask = async (q: string, def: string) =>
      (await rl.question(`${q} [${def}]: `)).trim() || def;
    const confirm = async (q: string, defYes: boolean) => {
      const a = (await rl.question(`${q} [${defYes ? "Y/n" : "y/N"}]: `)).trim().toLowerCase();
      return a ? a.startsWith("y") : defYes;
    };

    const devUrl = flags.devUrl ?? (await ask("Dev server URL", defaults.devUrl));

    let storybookUrl: string | null = null;
    const offerStorybook = !flags.skipStorybook && (flags.storybook || defaults.storybook.present);
    if (offerStorybook) {
      if (await confirm("Add a Storybook target?", Boolean(flags.storybook))) {
        storybookUrl = await ask("  Storybook URL", defaults.storybook.url);
      }
    }

    let prodUrl: string | null = flags.prodUrl ?? null;
    if (!prodUrl && (await confirm("Add a prod / staging target?", false))) {
      prodUrl = (await rl.question("  Prod / staging URL: ")).trim() || null;
    }

    const defaultTarget = flags.defaultTarget ?? (await ask("Default target", "dev"));
    return { devUrl, storybookUrl, prodUrl, defaultTarget };
  } finally {
    rl.close();
  }
}

export interface InitOptions {
  cwd: string;
  yes?: boolean;
  force?: boolean;
  devUrl?: string;
  storybook?: boolean;
  skipStorybook?: boolean;
  prodUrl?: string;
  defaultTarget?: string;
}

export interface InitResult {
  base: AccessLintConfig;
  local?: AccessLintConfig;
  wrote: string[];
  gitignoreUpdated: boolean;
  framework: string | null;
}

export async function runInit(opts: InitOptions): Promise<InitResult> {
  const defaults = inferDefaults(await readPackageJson(opts.cwd));
  const flags: InitFlags = {
    devUrl: opts.devUrl,
    storybook: opts.storybook,
    skipStorybook: opts.skipStorybook,
    prodUrl: opts.prodUrl,
    defaultTarget: opts.defaultTarget,
  };

  const interactive = !opts.yes && Boolean(process.stdin.isTTY);
  const answers = interactive
    ? await promptAnswers(defaults, flags)
    : resolveAnswers(defaults, flags);

  const { base, local } = buildConfig(answers);
  const { wrote, gitignoreUpdated } = await writeConfigFiles({
    cwd: opts.cwd,
    base,
    local,
    force: opts.force,
  });
  return { base, local, wrote, gitignoreUpdated, framework: defaults.framework };
}

export const initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Scaffold accesslint.config.json with named audit targets (dev, storybook, prod)",
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Accept framework-aware defaults without prompting",
      default: false,
    },
    cwd: { type: "string", description: "Project directory (default: current directory)" },
    "dev-url": { type: "string", description: "Dev server URL (overrides the framework default)" },
    storybook: { type: "boolean", description: "Add a Storybook target", default: false },
    "skip-storybook": {
      type: "boolean",
      description: "Do not add a Storybook target",
      default: false,
    },
    "prod-url": {
      type: "string",
      description: "Prod/staging URL (written to the gitignored overlay)",
    },
    default: { type: "string", description: "Name of the default target (default: dev)" },
    force: {
      type: "boolean",
      description: "Overwrite an existing accesslint.config.json",
      default: false,
    },
  },
  async run({ args }) {
    const result = await runInit({
      cwd: args.cwd ? String(args.cwd) : process.cwd(),
      yes: args.yes,
      force: args.force,
      devUrl: args["dev-url"],
      storybook: args.storybook,
      skipStorybook: args["skip-storybook"],
      prodUrl: args["prod-url"],
      defaultTarget: args.default,
    });

    const fwNote = result.framework ? ` (detected ${result.framework})` : "";
    console.log(`\n✓ Wrote ${CONFIG_FILENAME}${fwNote}`);
    console.log(`  default: ${result.base.default}`);
    for (const [name, t] of Object.entries(result.base.targets)) {
      console.log(`  ${name}: ${t.url}`);
    }
    if (result.local) {
      console.log(`✓ Wrote ${LOCAL_CONFIG_FILENAME} (gitignored)`);
      for (const [name, t] of Object.entries(result.local.targets)) {
        console.log(`  ${name}: ${t.url}`);
      }
      if (result.gitignoreUpdated) {
        console.log(`  added ${LOCAL_CONFIG_FILENAME} to .gitignore`);
      }
    }
    const devUrl = result.base.targets.dev?.url;
    if (devUrl) console.log(`\nNext: accesslint scan ${devUrl}`);
  },
});
