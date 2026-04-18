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
    deps: { neverBundle: ["jscodeshift"], onlyBundle: false },
    ...nodeDefaults,
  },
  {
    entry: ["./src/transforms/matcher-plugin.ts"],
    outDir: "./dist/transforms",
    deps: { neverBundle: ["jscodeshift"], onlyBundle: false },
    dts: true,
    ...nodeDefaults,
  },
  {
    entry: ["./src/transforms/index.ts"],
    outDir: "./dist/transforms",
    deps: { neverBundle: ["jscodeshift"], onlyBundle: false },
    dts: true,
    ...nodeDefaults,
  },
]);
