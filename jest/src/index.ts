/**
 * Auto-registers the toBeAccessible() matcher with Jest's expect.
 *
 * Usage in jest.config.js:
 *   module.exports = {
 *     setupFilesAfterEach: ["@accesslint/jest"],
 *     testEnvironment: "jsdom",
 *   };
 *
 * Or import directly in a setup file:
 *   import "@accesslint/jest";
 */
import { expect } from "@jest/globals";
import { accesslintMatchers } from "@accesslint/matchers-internal";
import type { AccessibleMatcherOptions } from "@accesslint/matchers-internal";

expect.extend(accesslintMatchers);

export * from "@accesslint/matchers-internal/matchers";

// Type parameters below (`T = unknown`, `T = {}`) must match the original
// declarations in `expect` and `@types/jest` exactly for declaration merging.
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-namespace */
declare module "expect" {
  interface Matchers<R extends void | Promise<void>, T = unknown> {
    toBeAccessible(options?: AccessibleMatcherOptions): R;
  }
  interface AsymmetricMatchers {
    toBeAccessible(options?: AccessibleMatcherOptions): void;
  }
}

declare global {
  namespace jest {
    interface Matchers<R, T = {}> {
      toBeAccessible(options?: AccessibleMatcherOptions): R;
    }
  }
}
