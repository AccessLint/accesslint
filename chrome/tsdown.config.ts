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
    deps: { neverBundle: ["chrome-launcher", "@puppeteer/browsers"] },
    ...nodeDefaults,
  },
  {
    entry: ["./src/chrome.ts"],
    deps: { neverBundle: ["chrome-launcher", "@puppeteer/browsers"] },
    dts: true,
    publint: true,
    attw: true,
    ...nodeDefaults,
  },
]);
