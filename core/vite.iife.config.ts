import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/standalone.ts"),
      formats: ["iife"],
      name: "AccessLint",
      fileName: () => "index.iife.js",
    },
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        footer: "if(typeof globalThis!=='undefined')globalThis.AccessLintCore=globalThis.AccessLint;",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
