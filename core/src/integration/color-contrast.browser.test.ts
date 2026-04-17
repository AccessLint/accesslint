import { describe, it, expect, afterEach } from "vitest";
import { colorContrast } from "../rules/distinguishable/color-contrast";
import { clearColorCaches } from "../rules/utils/color";
import type { Violation } from "../rules/types";
import { setContent, resetDocument } from "./vitest-browser-helpers";

afterEach(() => {
  clearColorCaches();
  resetDocument();
});

function run(): Violation[] {
  return colorContrast.run(document) as Violation[];
}

function expectViolation(violations: Violation[], selector?: string) {
  expect(violations.length, "expected at least one violation").toBeGreaterThan(0);
  const v = violations[0];
  expect(v.ruleId).toBe("distinguishable/color-contrast");
  expect(v.impact).toBe("serious");
  expect(v.context, "violation context should contain computed ratio").toMatch(
    /ratio: \d+(?:\.\d+)?:1/,
  );
  expect(v.context, "violation context should contain required threshold").toMatch(
    /required: \d+(?:\.\d+)?:1/,
  );
  if (selector) {
    expect(
      violations.some((v) => v.selector?.includes(selector)),
      `expected a violation whose selector includes "${selector}"`,
    ).toBe(true);
  }
}

function expectNoViolations(violations: Violation[]) {
  const detail = violations.map((v) => `${v.selector} — ${v.message}`).join("; ");
  expect(violations, `expected no violations, got: ${detail}`).toHaveLength(0);
}

describe("stylesheet-applied colors", () => {
  it("fails: class-applied low-contrast text — #999 on #aaa ≈ 1.23:1", () => {
    setContent(`
      <style>.muted { color: #999; background: #aaa }</style>
      <p class="muted">Hard to read</p>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/ratio: 1\.\d+:1/);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });

  it("passes: class-applied high-contrast text — #000 on #fff = 21:1", () => {
    setContent(`
      <style>.clear { color: #000; background: #fff }</style>
      <p class="clear">Easy to read</p>
    `);
    expectNoViolations(run());
  });

  it("fails: ID-selector low-contrast text — #888 on #999 ≈ 1.25:1", () => {
    setContent(`
      <style>#low { color: #888; background: #999 }</style>
      <p id="low">Low contrast</p>
    `);
    const violations = run();
    expectViolation(violations, "#low");
    expect(violations[0].context).toMatch(/ratio: 1\.\d+:1/);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });
});

describe("inherited styles", () => {
  it("fails: body color inherited onto low-contrast child background — #ccc on #ddd ≈ 1.18:1", () => {
    setContent(`
      <style>body { color: #ccc } .box { background: #ddd }</style>
      <div class="box"><p>Inherited low contrast</p></div>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/ratio: 1\.\d+:1/);
  });

  it("fails: low-contrast parent color inherited onto child background — #999 on #aaa ≈ 1.23:1", () => {
    setContent(`
      <style>.parent { color: #999 } .child { background: #aaa }</style>
      <div class="parent"><span class="child">Inherited low contrast</span></div>
    `);
    expectViolation(run());
  });

  it("passes: parent color with sufficient contrast against child background — #000 on #fff", () => {
    setContent(`
      <style>.parent { color: #000 } .child { background: #fff }</style>
      <div class="parent"><span class="child">Good contrast</span></div>
    `);
    expectNoViolations(run());
  });
});

describe("UA stylesheet defaults", () => {
  it("passes: h1 uses 3:1 large-text threshold — #808080 on white ≈ 3.95:1", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <h1 style="color: #808080">Heading</h1>
    `);
    expectNoViolations(run());
  });

  it("fails: same color (#808080 on white ≈ 3.95:1) fails 4.5:1 for normal-sized text", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p style="color: #808080">Normal text</p>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/ratio: 3\.\d+:1/);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });

  it("passes: 19px bold text qualifies as large text — #808080 on white ≈ 3.95:1", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p><b style="font-size: 19px; color: #808080">Bold large text</b></p>
    `);
    expectNoViolations(run());
  });

  it("fails: small text at default size — #888 on white ≈ 3.54:1 fails 4.5:1", () => {
    setContent(`
      <style>body { background: #fff }</style>
      <p><small style="color: #888">Small print</small></p>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/ratio: 3\.\d+:1/);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });
});

describe("CSS specificity and cascade", () => {
  it("fails: low-contrast class alone, no specificity override — #ccc on #ddd ≈ 1.18:1", () => {
    setContent(`
      <style>.bad { color: #ccc; background: #ddd }</style>
      <p class="bad">No override, rule should fire</p>
    `);
    expectViolation(run());
  });

  it("passes: inline style overrides low-contrast class", () => {
    setContent(`
      <style>.bad { color: #ccc; background: #ddd }</style>
      <p class="bad" style="color: #000; background: #fff">Inline wins</p>
    `);
    expectNoViolations(run());
  });

  it("passes: more-specific selector overrides less-specific", () => {
    setContent(`
      <style>
        p { color: #ccc; background: #ddd }
        .container p.good { color: #000; background: #fff }
      </style>
      <div class="container"><p class="good">Specific wins</p></div>
    `);
    expectNoViolations(run());
  });
});

describe("visual edge cases", () => {
  it("control: white text on white background reports a 1:1 violation without ::before", () => {
    setContent(`
      <style>body { background: white }</style>
      <div style="color: white">Text without overlay</div>
    `);
    const violations = run();
    expectViolation(violations);
    expect(violations[0].context).toMatch(/ratio: 1:1/);
    expect(violations[0].context).toMatch(/required: 4\.5:1/);
  });

  it("skips: ::before pseudo-element providing background overlay makes contrast unreliable", () => {
    setContent(`
      <style>
        body { background: white }
        .overlay { position: relative; color: #fff }
        .overlay::before {
          content: " ";
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: -1;
        }
      </style>
      <div class="overlay">Text over pseudo-bg</div>
    `);
    expectNoViolations(run());
  });

  it("passes: rgba child background composited correctly over white parent", () => {
    setContent(`
      <style>
        .parent { background: #fff }
        .child { background: rgba(0, 0, 0, 0.85); color: #fff }
      </style>
      <div class="parent"><p class="child">Composited bg</p></div>
    `);
    expectNoViolations(run());
  });

  it("control: element at opacity: 0.5 is still evaluated — low-contrast text fails", () => {
    setContent(`
      <style>
        body { background: #fff }
        .faded { opacity: 0.5 }
      </style>
      <div class="faded"><p style="color: #888">Half opacity, still checked</p></div>
    `);
    expectViolation(run());
  });

  it("skips: text inside ancestor with opacity: 0 is invisible", () => {
    setContent(`
      <style>
        .invisible { opacity: 0 }
        .text { color: #fff; background: #fff }
      </style>
      <div class="invisible"><p class="text">Zero opacity</p></div>
    `);
    expectNoViolations(run());
  });

  it("skips: .sr-only clip-rect pattern hides text from visual rendering", () => {
    setContent(`
      <style>
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      </style>
      <span class="sr-only" style="color: #fff; background: #fff">Hidden text</span>
    `);
    expectNoViolations(run());
  });
});
