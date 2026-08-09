import { describe, it, expect, afterEach } from "vitest";
import { focusOrder } from "../rules/keyboard-accessible/focus-order";
import { headingOrder } from "../rules/navigable/heading-order";
import { region } from "../rules/landmarks/region";
import { noDuplicateBanner } from "../rules/landmarks/no-duplicate-banner";
import { bannerIsTopLevel } from "../rules/landmarks/banner-is-top-level";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(resetDocument);

// The popup-plugin shape from the field report: markup is present in the DOM
// from page load, hidden by a stylesheet class until the popup is triggered.
const POPUP = `
  <style>.popup { display: none }</style>
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

describe("content hidden by a stylesheet", () => {
  it("keyboard-accessible/focus-order ignores tabbable-looking elements in the subtree", () => {
    setContent(POPUP);
    expect(focusOrder.run(document)).toHaveLength(0);
  });

  it("navigable/heading-order ignores headings in the subtree", () => {
    setContent(POPUP);
    expect(headingOrder.run(document)).toHaveLength(0);
  });

  it("landmarks/region ignores the subtree", () => {
    setContent(POPUP);
    expect(region.run(document)).toHaveLength(0);
  });

  it("landmarks/no-duplicate-banner ignores a hidden alternate header", () => {
    setContent(`
      <style>.mobile-header { display: none }</style>
      <header>Site header</header>
      <header class="mobile-header">Mobile header</header>
      <main>Content</main>
    `);
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
  it("reports the same popup markup once the subtree is shown", () => {
    setContent(POPUP.replace(".popup { display: none }", ".popup { display: block }"));
    expect(focusOrder.run(document)).toHaveLength(1);
    expect(headingOrder.run(document)).toHaveLength(1);
    expect(region.run(document)).toHaveLength(1);
  });

  it("reports an alternate header that the cascade leaves visible", () => {
    setContent(`
      <style>.mobile-header { display: block }</style>
      <header>Site header</header>
      <header class="mobile-header">Mobile header</header>
      <main>Content</main>
    `);
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
