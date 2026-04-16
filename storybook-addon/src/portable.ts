/**
 * Portable stories helper for using AccessLint with composeStories
 * outside of Storybook (plain Vitest, Jest, Playwright CT).
 *
 * Usage in your test setup file:
 *
 *   import { enableAccessLint } from "@accesslint/storybook-addon/portable";
 *   import { setProjectAnnotations } from "@storybook/react";
 *   import * as previewAnnotations from "./.storybook/preview";
 *
 *   const project = setProjectAnnotations([
 *     previewAnnotations,
 *     enableAccessLint(),
 *   ]);
 *   beforeAll(project.beforeAll);
 *
 * Then in tests:
 *
 *   import { composeStories } from "@storybook/react";
 *   import * as stories from "./Button.stories";
 *
 *   const { Primary } = composeStories(stories);
 *
 *   test("is accessible", async () => {
 *     await Primary.run();
 *     // AccessLint afterEach runs automatically and reports violations
 *   });
 */
import * as accesslintAnnotations from "./preview";

export function enableAccessLint() {
  return accesslintAnnotations;
}

export { accesslintAnnotations };
