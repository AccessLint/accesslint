import { Window } from "happy-dom";

let shared: Document | null = null;

/**
 * One document, plus the globals `@accesslint/core`'s rules read — the same
 * setup the PR reviewer's bin script performs, for the same reason: the engine
 * talks to a DOM API, not to a string.
 *
 * Deliberately a singleton. Rules use `instanceof HTMLImageElement` and friends,
 * and a second happy-dom Window brings its own constructors that elements from
 * the first one fail against.
 */
export function testDocument(): Document {
  if (shared) return shared;
  const window = new Window();
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (!globals[key]) globals[key] = (window as unknown as Record<string, unknown>)[key];
  }
  globals.getComputedStyle = window.getComputedStyle.bind(window);
  shared = window.document as unknown as Document;
  return shared;
}
