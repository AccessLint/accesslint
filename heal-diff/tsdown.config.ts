import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "./src/normalize.ts"],
  format: ["esm", "cjs"],
  platform: "node",
  fixedExtension: false,
  dts: true,
  treeshake: true,
});
