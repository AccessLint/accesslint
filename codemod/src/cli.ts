#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import Runner from "jscodeshift/src/Runner.js";
import { plugins, type PluginKey } from "./registry.js";

const matcherTransformPath = fileURLToPath(
  new URL("./transforms/matcher-plugin.js", import.meta.url),
);

const sharedArgs = {
  dry: {
    type: "boolean",
    description: "Print changes without writing files",
    default: false,
  },
  print: {
    type: "boolean",
    description: "Print transformed source to stdout",
    default: false,
  },
  parser: {
    type: "string",
    description: "jscodeshift parser: babel | babylon | flow | ts | tsx",
    default: "tsx",
  },
  extensions: {
    type: "string",
    description: "Comma-separated file extensions to process",
    default: "js,jsx,ts,tsx",
  },
  verbose: {
    type: "string",
    description: "Verbosity (0-2)",
    default: "0",
  },
} as const;

type RunnerOptions = Record<string, unknown> & {
  dry: boolean;
  print: boolean;
  parser: string;
  extensions: string;
  verbose: number;
  babel: boolean;
  silent: boolean;
  runInBand: boolean;
};

type RunnerResult = {
  error?: number;
  ok?: number;
  nochange?: number;
  skip?: number;
};

const runTransform = async (
  transformPath: string,
  paths: string[],
  extraOptions: Record<string, unknown>,
  args: {
    dry: boolean;
    print: boolean;
    parser: string;
    extensions: string;
    verbose: string;
  },
): Promise<void> => {
  if (paths.length === 0) {
    console.error("Error: at least one path is required.");
    process.exitCode = 2;
    return;
  }

  const options: RunnerOptions = {
    dry: args.dry,
    print: args.print,
    parser: args.parser,
    extensions: args.extensions,
    verbose: Number.parseInt(args.verbose, 10) || 0,
    babel: false,
    silent: false,
    runInBand: false,
    ...extraOptions,
  };

  const res = (await Runner.run(transformPath, paths, options)) as RunnerResult;
  process.exitCode = (res?.error ?? 0) > 0 ? 1 : 0;
};

const makeMatcherSubcommand = (key: PluginKey) =>
  defineCommand({
    meta: {
      name: key,
      description: `Migrate ${key} → ${plugins[key].targetModule}`,
    },
    args: sharedArgs,
    async run({ args }) {
      const paths = args._;
      await runTransform(matcherTransformPath, paths, { ...plugins[key] }, args);
    },
  });

const autoCmd = defineCommand({
  meta: {
    name: "auto",
    description:
      "Detect installed axe plugins from nearest package.json and run all applicable migrations",
  },
  args: sharedArgs,
  async run({ args }) {
    const paths = args._;
    const detected = await detectInstalledPlugins();
    if (detected.length === 0) {
      console.error(
        "Error: no known axe plugins found in nearest package.json. Known plugins: " +
          Object.keys(plugins).join(", "),
      );
      process.exitCode = 2;
      return;
    }
    console.error(`Detected plugin(s): ${detected.join(", ")}`);
    for (const key of detected) {
      console.error(`\n→ Running ${key} → ${plugins[key].targetModule}`);
      await runTransform(matcherTransformPath, paths, { ...plugins[key] }, args);
      if (process.exitCode === 1) return;
    }
  },
});

const detectInstalledPlugins = async (): Promise<PluginKey[]> => {
  const pkg = await findNearestPackageJson(process.cwd());
  if (!pkg) return [];
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return (Object.keys(plugins) as PluginKey[]).filter(
    (key) => plugins[key].sourceModule in all,
  );
};

type PkgJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const findNearestPackageJson = async (start: string): Promise<PkgJson | null> => {
  let dir = resolvePath(start);
  while (true) {
    try {
      const raw = await readFile(resolvePath(dir, "package.json"), "utf8");
      return JSON.parse(raw) as PkgJson;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
};

const main = defineCommand({
  meta: {
    name: "accesslint-codemod",
    version: "0.1.0",
    description: "Migrate axe plugins (jest-axe, vitest-axe, jasmine-axe) to AccessLint",
  },
  subCommands: Object.fromEntries([
    ...(Object.keys(plugins) as PluginKey[]).map((key) => [key, makeMatcherSubcommand(key)]),
    ["auto", autoCmd],
  ]),
});

runMain(main);
