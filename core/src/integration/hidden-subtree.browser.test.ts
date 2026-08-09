import { describe, it, expect, afterEach } from "vitest";
import { focusOrder } from "../rules/keyboard-accessible/focus-order";
import { headingOrder } from "../rules/navigable/heading-order";
import { region } from "../rules/landmarks/region";
import { noDuplicateBanner } from "../rules/landmarks/no-duplicate-banner";
import { bannerIsTopLevel } from "../rules/landmarks/banner-is-top-level";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(resetDocument);

function popup(display: string): string {
  return `
    <style>.popup { display: ${display} }</style>
    <main>
      <h1>Marketing page</h1>
      <h2>Features</h2>
    </main>
    <div class="popup">
      <h4>Join the list</h4>
      <div tabindex="0">Close</div>
      <p>Sign up for weekly updates.</p>
    </div>
  `;
}

function wrappedPopup(display: string): string {
  return `
    <style>.popup { display: ${display} }</style>
    <main>Content</main>
    <div class="wrapper">
      <div class="popup">
        <p>Sign up for weekly updates.</p>
      </div>
    </div>
  `;
}

function alternateHeader(display: string): string {
  return `
    <style>.mobile-header { display: ${display} }</style>
    <header>Site header</header>
    <header class="mobile-header">Mobile header</header>
    <main>Content</main>
  `;
}

const POPUP_RULES = [focusOrder, headingOrder, region];

describe("content hidden by a stylesheet", () => {
  it.each(POPUP_RULES)("$id ignores the subtree", (rule) => {
    setContent(popup("none"));
    expect(rule.run(document)).toHaveLength(0);
  });

  it("landmarks/region ignores a hidden popup inside a visible wrapper", () => {
    setContent(wrappedPopup("none"));
    expect(region.run(document)).toHaveLength(0);
  });

  it("landmarks/no-duplicate-banner ignores a hidden alternate header", () => {
    setContent(alternateHeader("none"));
    expect(noDuplicateBanner.run(document)).toHaveLength(0);
  });

  it("landmarks/banner-is-top-level ignores a nested banner in the subtree", () => {
    setContent(`
      <style>.popup { display: none }</style>
      <main>
        <div class="popup"><div role="banner">Popup header</div></div>
      </main>
    `);
    expect(bannerIsTopLevel.run(document)).toHaveLength(0);
  });
});

describe("visible content is still reported under a real cascade", () => {
  it.each(POPUP_RULES)("$id reports the same markup once shown", (rule) => {
    setContent(popup("block"));
    expect(rule.run(document)).toHaveLength(1);
  });

  it("landmarks/region reports a shown popup inside a visible wrapper", () => {
    setContent(wrappedPopup("block"));
    expect(region.run(document)).toHaveLength(1);
  });

  it("landmarks/no-duplicate-banner reports a shown alternate header", () => {
    setContent(alternateHeader("block"));
    expect(noDuplicateBanner.run(document)).toHaveLength(1);
  });

  it("still reports sr-only content, which screen readers do expose", () => {
    setContent(`
      <style>
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
        }
      </style>
      <main>
        <h1>Page</h1>
        <h3 class="sr-only">Skipped level</h3>
      </main>
    `);
    expect(headingOrder.run(document)).toHaveLength(1);
  });
});
