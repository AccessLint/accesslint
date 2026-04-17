import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/matchers.ts", "./src/fixture.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  fixedExtension: false,
  deps: {
    neverBundle: ["vitest"],
  },
  dts: true,
  treeshake: true,
  publint: true,
  attw: true,
});
