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
        // Read from the local `AccessLint` binding (in scope at footer position
        // regardless of how the chunk is evaluated) and pin it onto globalThis.
        // Fixes loaders like `new Function(code)()` where the IIFE's top-level
        // `var AccessLint = ...` becomes a function-local instead of a global.
        footer:
          "if(typeof globalThis!=='undefined'){globalThis.AccessLint=AccessLint;globalThis.AccessLintCore=AccessLint;}",
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
