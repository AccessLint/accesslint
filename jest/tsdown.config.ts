import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  fixedExtension: false,
  deps: {
    neverBundle: ["jest", "@jest/globals"],
  },
  dts: true,
  treeshake: true,
  publint: true,
  attw: true,
});
