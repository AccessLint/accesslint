import { describe, it, expect, afterEach } from "vitest";
import { colorContrastEnhanced } from "../rules/distinguishable/color-contrast-enhanced";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return colorContrastEnhanced.run(document) as Violation[];
}

function expectViolation(violations: Violation[]) {
  expect(violations.length, "expected at least one violation").toBeGreaterThan(0);
  const v = violations[0];
  expect(v.ruleId).toBe("distinguishable/color-contrast-enhanced");
  expect(v.impact).toBe("serious");
  expect(v.context, "violation context should contain computed ratio").toMatch(/ratio: \d+(?:\.\d+)?:1/);
  expect(v.context, "violation context should contain required threshold").toMatch(/required: \d+(?:\.\d+)?:1/);
}

describe("AAA normal-text threshold (7:1)", () => {
  it("fails: #767676 on white ≈ 4.54:1 passes AA but fails AAA 7:1", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p style="color: #767676">Borderline AA passes, AAA fails</p>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/required: 7:1/);
  });

  it("passes: #595959 on white ≈ 7:1 meets AAA normal threshold", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p style="color: #595959">Meets AAA exactly</p>
    `);
    expect(run()).toHaveLength(0);
  });

  it("passes: black on white (21:1) clearly meets AAA", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p style="color: #000">High contrast</p>
    `);
    expect(run()).toHaveLength(0);
  });
});

describe("AAA large-text threshold (4.5:1)", () => {
  it("passes: h1 at #767676 on white (≈4.54:1) meets AAA 4.5:1 large-text threshold", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <h1 style="color: #767676">Large heading</h1>
    `);
    expect(run()).toHaveLength(0);
  });

  it("fails: h1 at #8c8c8c on white (≈3.5:1) fails AAA 4.5:1 large-text threshold", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <h1 style="color: #8c8c8c">Too-light heading</h1>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });

  it("passes: 19px bold text qualifies as large text at AAA", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p><b style="font-size: 19px; color: #767676">Bold large text</b></p>
    `);
    expect(run()).toHaveLength(0);
  });
});

describe("stylesheet-applied colors at AAA", () => {
  it("fails: class-applied color passing AA but failing AAA", () => {
    setContent(`
      <style>
        body { background: #fff }
        .muted { color: #767676 }
      </style>
      <p class="muted">Stylesheet-applied borderline color</p>
    `);
    expectViolation(run());
  });

  it("passes: inherited high-contrast color meets AAA", () => {
    setContent(`
      <style>
        body { background: #fff; color: #000 }
      </style>
      <div><p>Inherited black on white</p></div>
    `);
    expect(run()).toHaveLength(0);
  });
});
