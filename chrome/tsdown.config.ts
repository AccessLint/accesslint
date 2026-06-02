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
    deps: { neverBundle: ["chrome-launcher"] },
    ...nodeDefaults,
  },
  {
    entry: ["./src/chrome.ts"],
    deps: { neverBundle: ["chrome-launcher"] },
    dts: true,
    publint: true,
    attw: true,
    ...nodeDefaults,
  },
]);
