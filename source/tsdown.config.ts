import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/jsx/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  fixedExtension: false,
  dts: true,
  treeshake: true,
  publint: true,
  attw: true,
});
