import { describe, it, expect, afterEach } from "vitest";
import { scrollableRegion } from "../rules/keyboard-accessible/scrollable-region";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return scrollableRegion.run(document) as Violation[];
}

describe("real overflow detection", () => {
  it("fails: overflow:auto region with real overflowing content and no keyboard access", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="scroll">
        <p style="height: 400px">Tall content that forces vertical overflow.</p>
      </div>
    `);
    const violations = run();
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("keyboard-accessible/scrollable-region");
    expect(violations[0].impact).toBe("serious");
  });

  it("fails: overflow:scroll region with real overflow", () => {
    setContent(`
      <style>
        .scroll { overflow: scroll; width: 200px; height: 100px }
      </style>
      <div class="scroll">
        <p style="height: 400px">Forced scroll with overflow.</p>
      </div>
    `);
    expect(run()).toHaveLength(1);
  });

  it("passes: overflow:auto region whose content does NOT overflow (no real scrolling)", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 200px }
      </style>
      <div class="scroll"><p>Short content</p></div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: overflow:hidden is not a scrollable region", () => {
    setContent(`
      <style>
        .clip { overflow: hidden; width: 200px; height: 100px }
      </style>
      <div class="clip"><p style="height: 400px">Clipped, not scrolled</p></div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: scrollable region with tabindex=0 (focusable)", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="scroll" tabindex="0">
        <p style="height: 400px">Keyboard-accessible scroll region.</p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: scrollable region containing a focusable child", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="scroll">
        <p style="height: 400px">Long content</p>
        <a href="#end">Jump to end</a>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: horizontal overflow <14px is treated as sub-pixel rounding", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="scroll">
        <p style="width: 210px">Slight overflow should not fire.</p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: tiny element (<64px) is too small to matter", () => {
    setContent(`
      <style>
        .tiny { overflow: auto; width: 50px; height: 50px }
      </style>
      <div class="tiny">
        <p style="height: 400px">Tiny scrollable region</p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });
});

describe("role-based skips with real overflow", () => {
  it("passes: role=listbox manages its own keyboard interaction", () => {
    setContent(`
      <style>
        .lb { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="lb" role="listbox">
        <div role="option" style="height: 400px">Option</div>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: aria-hidden scrollable region is skipped", () => {
    setContent(`
      <style>
        .scroll { overflow: auto; width: 200px; height: 100px }
      </style>
      <div class="scroll" aria-hidden="true">
        <p style="height: 400px">Hidden from a11y tree</p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });
});
