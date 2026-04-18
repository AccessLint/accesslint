/**
 * @vitest-environment happy-dom
 *
 * Smoke tests for the Vitest wrapper: auto-registration and the `a11y` fixture.
 * Core matcher behavior is covered in @accesslint/matchers-internal.
 */
import { describe, expect, it } from "vitest";
import "./index";
import { test as a11yTest } from "./fixture";

describe("auto-registration", () => {
  it("registers toBeAccessible on expect", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(() => expect(el).toBeAccessible()).not.toThrow();
    el.remove();
  });
});

describe("a11y fixture", () => {
  a11yTest("exposes refresh()", ({ a11y }) => {
    expect(typeof a11y.refresh).toBe("function");
    expect(() => a11y.refresh()).not.toThrow();
  });

  a11yTest("enables cached audits within the test body", ({ a11y }) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(el).toBeAccessible();
    a11y.refresh();
    expect(el).toBeAccessible();
    el.remove();
  });
});
