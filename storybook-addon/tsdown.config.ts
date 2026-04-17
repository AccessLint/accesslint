import { defineConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

const { managerEntries = [], previewEntries = [] } = pkg.bundler || {};

const external = ["storybook", "react", "react-dom"];

const browserDefaults = {
  platform: "browser" as const,
  fixedExtension: false,
  treeshake: true,
};

const nodeDefaults = {
  platform: "node" as const,
  fixedExtension: false,
  target: "node20" as const,
  treeshake: true,
};

const configs = [];

if (managerEntries.length) {
  configs.push({
    entry: managerEntries,
    format: ["esm"] as const,
    deps: { neverBundle: external },
    ...browserDefaults,
  });
}

if (previewEntries.length) {
  configs.push({
    entry: previewEntries,
    format: ["esm", "cjs"] as const,
    dts: true,
    deps: { neverBundle: external },
    ...browserDefaults,
  });
}

configs.push({
  entry: ["./src/vitest-plugin.ts"],
  format: ["esm", "cjs"] as const,
  dts: true,
  deps: { neverBundle: external },
  ...nodeDefaults,
});

configs.push({
  entry: ["./src/vitest-setup.ts"],
  format: ["esm", "cjs"] as const,
  dts: true,
  deps: { neverBundle: [...external, "vitest", "@accesslint/vitest"] },
  ...browserDefaults,
});

configs.push({
  entry: ["./src/matchers.ts"],
  format: ["esm", "cjs"] as const,
  dts: true,
  deps: { neverBundle: [...external, "@accesslint/vitest"] },
  ...browserDefaults,
});

configs.push({
  entry: ["./src/portable.ts"],
  format: ["esm", "cjs"] as const,
  dts: true,
  deps: { neverBundle: external },
  publint: true,
  attw: true,
  ...browserDefaults,
});

export default defineConfig(configs);
