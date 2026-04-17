import { describe, it, expect, afterEach } from "vitest";
import { letterSpacing } from "../rules/distinguishable/letter-spacing";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return letterSpacing.run(document) as Violation[];
}

describe("px letter-spacing with real computed font-size", () => {
  it("fails: 1px !important on 16px text → 0.0625em, below 0.12em", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="letter-spacing: 1px !important">Tight letters</p>
    `);
    const violations = run();
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("distinguishable/letter-spacing");
  });

  it("passes: 2px !important on 16px text → 0.125em, meets 0.12em", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <p style="letter-spacing: 2px !important">Comfortable letters</p>
    `);
    expect(run()).toHaveLength(0);
  });

  it("fails: 1.5px !important on 20px stylesheet-applied font → 0.075em, below 0.12em", () => {
    setContent(`
      <style>
        body { font-size: 20px }
        .big { font-size: 20px }
      </style>
      <p class="big" style="letter-spacing: 1.5px !important">Tight on large text</p>
    `);
    expect(run()).toHaveLength(1);
  });

  it("passes: 3px !important on 20px stylesheet-applied font → 0.15em, above 0.12em", () => {
    setContent(`
      <style>
        body { font-size: 20px }
        .big { font-size: 20px }
      </style>
      <p class="big" style="letter-spacing: 3px !important">Spacious on large text</p>
    `);
    expect(run()).toHaveLength(0);
  });
});

describe("inherited px letter-spacing affecting descendant text", () => {
  it("fails: parent declares 1px !important, child text inherits and has 16px font", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <div style="letter-spacing: 1px !important"><p>Child text inherits tight spacing</p></div>
    `);
    expect(run()).toHaveLength(1);
  });

  it("passes: parent declares 3px !important, child has 16px font → 0.1875em meets 0.12em", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <div style="letter-spacing: 3px !important"><p>Child text inherits adequate spacing</p></div>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: descendant overrides parent's tight spacing with its own !important", () => {
    setContent(`
      <style>body { font-size: 16px }</style>
      <div style="letter-spacing: 1px !important">
        <p style="letter-spacing: 3px !important">Overridden by child</p>
      </div>
    `);
    expect(run()).toHaveLength(0);
  });
});
