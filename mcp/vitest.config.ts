import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/**/*.integration.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/**/*.integration.test.ts"],
          // Launches a real Chrome and shells out to the built CLI, so it
          // needs `turbo run build` to have run first.
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
