import { defineConfig } from "tsdown";

const nodeDefaults = {
  platform: "node" as const,
  fixedExtension: false,
  treeshake: true,
};

export default defineConfig([
  {
    entry: ["./src/cli.ts"],
    format: ["esm"] as const,
    deps: { onlyBundle: false },
    ...nodeDefaults,
  },
  {
    entry: ["./src/index.ts", "./src/history.ts", "./src/aggregate.ts"],
    format: ["esm", "cjs"] as const,
    deps: { neverBundle: ["@accesslint/core"] },
    dts: true,
    publint: true,
    attw: true,
    ...nodeDefaults,
  },
]);
