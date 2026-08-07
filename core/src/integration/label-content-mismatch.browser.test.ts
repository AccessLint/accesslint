import { describe, it, expect, afterEach } from "vitest";
import { labelContentMismatch } from "../rules/labels-and-names/label-content-mismatch";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return labelContentMismatch.run(document) as Violation[];
}

describe("visible text under a real cascade", () => {
  it("passes: a class-hidden popup duplicate is not visible text", () => {
    setContent(`
      <style>.popup { display: none }</style>
      <a href="/story" aria-label="Read the full story, Chapter 4">
        Read the full story
        <span class="popup">Opens in a new window and may ask you to sign in first</span>
      </a>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: a visibility:hidden duplicate is not visible text", () => {
    setContent(`
      <style>.ghost { visibility: hidden }</style>
      <button aria-label="Add to cart now">
        Add to cart
        <span class="ghost">Widget Deluxe, three in stock, ships Tuesday</span>
      </button>
    `);
    expect(run()).toHaveLength(0);
  });

  it("still reports a mismatch when the extra text is on screen", () => {
    setContent(`
      <style>.note { display: block }</style>
      <a href="/story" aria-label="Read the full story">
        Continue
        <span class="note">Subscribers only</span>
      </a>
    `);
    const violations = run();
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("labels-and-names/label-content-mismatch");
  });

  it("passes: a card link whose name is its title plus a stray comma", () => {
    setContent(`
      <style>.tags span { display: inline-block }</style>
      <a href="/post" aria-label="The Shape of Quiet Rivers, ">
        <div class="card">
          <h3>The Shape of Quiet Rivers</h3>
          <div><span>Field Notes</span> <span>May 29, 2026</span></div>
          <div class="tags"><span>Essays</span> <span>Talks</span> <span>Video</span></div>
        </div>
      </a>
    `);
    expect(run()).toHaveLength(0);
  });
});
