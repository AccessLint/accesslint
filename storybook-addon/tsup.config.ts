import { defineConfig } from "tsup";
import pkg from "./package.json" with { type: "json" };

const { managerEntries = [], previewEntries = [], nodeEntries = [] } =
  pkg.bundler || {};

const external = ["storybook", "react", "react-dom"];

export default defineConfig((options) => {
  const configs = [];

  if (managerEntries.length) {
    configs.push({
      entry: managerEntries,
      outDir: "dist",
      format: ["esm" as const],
      target: "esnext" as const,
      platform: "browser" as const,
      external,
      treeshake: true,
      ...options,
    });
  }

  if (previewEntries.length) {
    configs.push({
      entry: previewEntries,
      outDir: "dist",
      format: ["esm" as const, "cjs" as const],
      target: "esnext" as const,
      platform: "browser" as const,
      external,
      dts: true,
      treeshake: true,
      ...options,
    });
  }

  if (nodeEntries.length) {
    configs.push({
      entry: nodeEntries,
      outDir: "dist",
      format: ["esm" as const, "cjs" as const],
      target: "node20" as const,
      platform: "node" as const,
      external,
      dts: true,
      treeshake: true,
      ...options,
    });
  }

  // Vitest plugin (node — it's a Vite plugin)
  configs.push({
    entry: ["./src/vitest-plugin.ts"],
    outDir: "dist",
    format: ["esm" as const, "cjs" as const],
    target: "node20" as const,
    platform: "node" as const,
    external,
    dts: true,
    treeshake: true,
    ...options,
  });

  // Vitest setup file (browser — runs in vitest browser context)
  configs.push({
    entry: ["./src/vitest-setup.ts"],
    outDir: "dist",
    format: ["esm" as const, "cjs" as const],
    target: "esnext" as const,
    platform: "browser" as const,
    external: [...external, "vitest", "@accesslint/vitest"],
    dts: true,
    treeshake: true,
    ...options,
  });

  // Custom Vitest matchers (re-export from @accesslint/vitest)
  configs.push({
    entry: ["./src/matchers.ts"],
    outDir: "dist",
    format: ["esm" as const, "cjs" as const],
    target: "esnext" as const,
    platform: "browser" as const,
    external: [...external, "@accesslint/vitest"],
    dts: true,
    treeshake: true,
    ...options,
  });

  // Portable stories helper (browser — used in external test setups)
  configs.push({
    entry: ["./src/portable.ts"],
    outDir: "dist",
    format: ["esm" as const, "cjs" as const],
    target: "esnext" as const,
    platform: "browser" as const,
    external,
    dts: true,
    treeshake: true,
    ...options,
  });

  return configs;
});
