import { defineConfig } from "vite";
import { resolve } from "path";
import { playwright } from "@vitest/browser-playwright";

const sharedResolve = {
  alias: {
    "@": resolve(__dirname, "src"),
  },
};

export default defineConfig({
  resolve: sharedResolve,
  test: {
    projects: [
      {
        resolve: sharedResolve,
        test: {
          name: "unit",
          environment: "happy-dom",
          setupFiles: ["src/test-setup.ts"],
          include: ["src/**/*.test.ts"],
          exclude: ["src/bench/memory.test.ts", "src/**/*.browser.test.ts"],
          hookTimeout: 60_000,
        },
      },
      {
        resolve: sharedResolve,
        test: {
          name: "memory",
          environment: "happy-dom",
          setupFiles: ["src/test-setup.ts"],
          include: ["src/bench/memory.test.ts"],
          pool: "forks",
          poolOptions: {
            forks: {
              execArgv: ["--expose-gc"],
            },
          },
        },
      },
      {
        resolve: sharedResolve,
        test: {
          name: "browser",
          setupFiles: ["src/test-setup.ts"],
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright({ launch: { headless: true } }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/rules/**/*.ts"],
      exclude: ["src/rules/**/*.test.ts"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
