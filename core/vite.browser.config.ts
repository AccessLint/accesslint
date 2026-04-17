import { defineConfig } from "vite";
import { resolve } from "path";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    name: "browser",
    browser: {
      enabled: true,
      provider: playwright({ launch: { headless: true } }),
      instances: [{ browser: "chromium" }],
    },
    include: ["src/**/*.browser.test.ts"],
    setupFiles: ["src/test-setup.ts"],
  },
});
