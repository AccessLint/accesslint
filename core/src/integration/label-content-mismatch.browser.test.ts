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

  it("passes: a card link in a class-hidden carousel slide", () => {
    setContent(`
      <style>.slide { display: none } .slide.current { display: block }</style>
      <div class="carousel">
        <div class="slide current">
          <a href="/post-1" aria-label="The Shape of Quiet Rivers">
            <h3>The Shape of Quiet Rivers</h3>
          </a>
        </div>
        <div class="slide">
          <a href="/post-2" aria-label="Read more">
            <h3>A Longer Way Around</h3>
            <p>Body prose that nobody on this page can see.</p>
          </a>
        </div>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("still reports the on-screen slide when a hidden sibling would also mismatch", () => {
    setContent(`
      <style>.slide { display: none } .slide.current { display: block }</style>
      <div class="carousel">
        <div class="slide current">
          <a href="/post-1" aria-label="Read more">
            <h3>The Shape of Quiet Rivers</h3>
            <p>Body prose that is on screen.</p>
          </a>
        </div>
        <div class="slide">
          <a href="/post-2" aria-label="Read more">
            <h3>A Longer Way Around</h3>
            <p>Body prose that nobody can see.</p>
          </a>
        </div>
      </div>
    `);
    const violations = run();
    expect(violations).toHaveLength(1);
    expect(violations[0].selector).toContain("/post-1");
  });

  it("passes: a control under a visibility:hidden ancestor", () => {
    setContent(`
      <style>.offstage { visibility: hidden }</style>
      <div class="offstage">
        <button aria-label="Send email">Submit</button>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: a labelled field in a class-hidden step of a form", () => {
    setContent(`
      <style>.step { display: none }</style>
      <div class="step">
        <label for="ship">Shipping address</label>
        <input id="ship" aria-label="Billing address">
      </div>
    `);
    expect(run()).toHaveLength(0);
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
