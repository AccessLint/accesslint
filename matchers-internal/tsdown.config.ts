import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/audit.ts",
    "./src/cache.ts",
    "./src/matchers.ts",
    "./src/snapshot.ts",
  ],
  format: ["esm", "cjs"],
  platform: "node",
  fixedExtension: false,
  dts: true,
  treeshake: true,
});
