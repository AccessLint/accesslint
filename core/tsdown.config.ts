import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  fixedExtension: false,
  dts: true,
  treeshake: true,
  // publint/attw run after the vite iife build via the package.json script chain,
  // so the complete dist/ (including dist/index.iife.js) is validated.
});
