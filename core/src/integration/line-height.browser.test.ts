import { describe, it, expect, afterEach } from "vitest";
import { lineHeight } from "../rules/distinguishable/line-height";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return lineHeight.run(document) as Violation[];
}

describe("single-line skip using real layout", () => {
  it("passes: tight line-height on a single short line does not affect wrapping", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="line-height: 1.0 !important; width: 1000px">Short</p>
    `);
    expect(run()).toHaveLength(0);
  });

  it("fails: tight line-height on multi-line wrapped text", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="line-height: 1.0 !important; width: 100px">
        This sentence is long enough to wrap across several lines at this width.
      </p>
    `);
    const violations = run();
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("distinguishable/line-height");
  });
});

describe("px line-height with real computed font-size", () => {
  it("fails: 15px !important on 16px text → 0.9375 ratio, below 1.5, multi-line", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="line-height: 15px !important; width: 100px">
        Long enough to wrap to multiple lines at this narrow width.
      </p>
    `);
    expect(run()).toHaveLength(1);
  });

  it("passes: 25px !important on 16px text → 1.5625 ratio, above 1.5", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="line-height: 25px !important; width: 100px">
        Long enough to wrap to multiple lines at this narrow width.
      </p>
    `);
    expect(run()).toHaveLength(0);
  });
});

describe("horizontal-scroll skip", () => {
  it("passes: tight line-height inside a horizontal-only-scroll container with wide content", () => {
    setContent(`
      <style>
        body { font-size: 16px }
        .hscroll { overflow-x: auto; overflow-y: hidden; width: 200px; white-space: nowrap }
      </style>
      <div class="hscroll">
        <p style="line-height: 1.0 !important; width: 2000px">
          One very long non-wrapping line inside a horizontal-only scroller.
        </p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });
});
