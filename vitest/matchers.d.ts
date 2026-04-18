import type { AccessibleMatcherOptions } from "@accesslint/matchers-internal";

declare module "vitest" {
  interface Assertion<T> {
    toBeAccessible(options?: AccessibleMatcherOptions): void;
  }
  interface AsymmetricMatchersContaining {
    toBeAccessible(options?: AccessibleMatcherOptions): void;
  }
}
