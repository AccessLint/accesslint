import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/matchers.ts"],
  format: ["esm", "cjs"],
  platform: "browser",
  deps: {
    neverBundle: ["vitest"],
  },
  dts: true,
  treeshake: true,
  publint: true,
  attw: true,
});
