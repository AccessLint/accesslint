import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30_000,
  projects: [
    {
      name: "browser",
      testDir: "src/act",
      testMatch: "act-browser.spec.ts",
      use: { browserName: "chromium" },
    },
    {
      name: "integration",
      testDir: "src/integration",
      testMatch: "browser.spec.ts",
      use: { browserName: "chromium" },
    },
  ],
  reporter: [
    ["list"],
    ["./src/act/browser-earl-reporter.ts"],
  ],
});
