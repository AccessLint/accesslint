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
      neverBundle: ["chrome-remote-interface", "@accesslint/chrome"],
      onlyBundle: false,
    },
    ...nodeDefaults,
  },
  {
    entry: ["./src/cdp-audit.ts", "./src/ssrf-guard.ts", "./src/safe-fetch.ts"],
    deps: { neverBundle: ["@accesslint/core", "@accesslint/heal-diff", "@accesslint/matchers-internal"] },
    dts: true,
    publint: true,
    attw: { profile: "esm-only" },
    ...nodeDefaults,
  },
]);
