/**
 * Integration smoke tests for the Jest wrapper. Core matcher behavior is
 * covered in @accesslint/matchers-internal; these tests only verify that
 * importing the package auto-registers `toBeAccessible` on Jest's expect.
 *
 * @jest-environment jsdom
 */
import { describe, expect, it } from "@jest/globals";
import "./index";

describe("auto-registration", () => {
  it("registers toBeAccessible on expect", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    expect(() => expect(el).toBeAccessible()).not.toThrow();
    el.remove();
  });

  it("passes on an accessible element", () => {
    const el = document.createElement("button");
    el.textContent = "Submit";
    document.body.appendChild(el);
    expect(el).toBeAccessible();
    el.remove();
  });

  it("fails on an inaccessible element", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);
    expect(() => expect(img).toBeAccessible()).toThrow();
    img.remove();
  });

  it("respects disabledRules option", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);
    expect(img).toBeAccessible({
      disabledRules: ["text-alternatives/img-alt"],
    });
    img.remove();
  });
});
