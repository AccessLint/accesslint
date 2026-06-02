import { defineConfig } from "tsdown";

const nodeDefaults = {
  format: ["esm"] as const,
  platform: "node" as const,
  fixedExtension: false,
  treeshake: true,
};

export default defineConfig([
  {
    entry: ["./src/cli.ts"],
    deps: {
      neverBundle: ["chrome-remote-interface", "@accesslint/cli", "@accesslint/core", "@accesslint/matchers-internal"],
      onlyBundle: false,
    },
    ...nodeDefaults,
  },
  {
    entry: ["./src/index.ts"],
    deps: {
      neverBundle: ["chrome-remote-interface", "@accesslint/cli", "@accesslint/core", "@accesslint/matchers-internal"],
    },
    dts: true,
    publint: true,
    attw: { profile: "esm-only" },
    ...nodeDefaults,
  },
]);
