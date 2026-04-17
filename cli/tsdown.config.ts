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
    deps: { neverBundle: ["jsdom"], onlyBundle: false },
    ...nodeDefaults,
  },
  {
    entry: ["./src/audit.ts", "./src/inline-css.ts", "./src/ssrf-guard.ts", "./src/safe-fetch.ts"],
    deps: { neverBundle: ["jsdom", "@accesslint/core"] },
    dts: true,
    publint: true,
    attw: true,
    ...nodeDefaults,
  },
]);
