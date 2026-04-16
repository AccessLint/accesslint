import type { AccessibleMatcherOptions } from "./dist/matchers";

declare module "vitest" {
  interface Assertion<T> {
    toBeAccessible(options?: AccessibleMatcherOptions): void;
  }
  interface AsymmetricMatchersContaining {
    toBeAccessible(options?: AccessibleMatcherOptions): void;
  }
}
