import { defineConfig } from "tsdown";

const shared = {
  format: ["esm", "cjs"] as const,
  platform: "node" as const,
  fixedExtension: false,
  deps: {
    neverBundle: ["@playwright/test"],
  },
  dts: true,
  treeshake: true,
};

export default defineConfig([
  { entry: ["./src/index.ts"], ...shared },
  { entry: ["./src/matchers.ts"], ...shared },
]);
