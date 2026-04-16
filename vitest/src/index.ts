/**
 * Auto-registers the toBeAccessible() matcher with Vitest's expect.
 *
 * Usage in vitest.config.ts:
 *   test: { setupFiles: ["@accesslint/vitest"] }
 *
 * Or import directly in a test/setup file:
 *   import "@accesslint/vitest";
 */
import { expect } from "vitest";
import { accesslintMatchers } from "./matchers";

expect.extend(accesslintMatchers);

export * from "./matchers";
