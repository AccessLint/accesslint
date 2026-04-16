import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    target: "esnext",
    platform: "browser",
    external: ["vitest"],
    dts: true,
    treeshake: true,
  },
  {
    entry: ["./src/matchers.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    target: "esnext",
    platform: "browser",
    external: ["vitest"],
    dts: true,
    treeshake: true,
  },
]);
