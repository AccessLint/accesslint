import { test, expect } from "@playwright/test";
import { iifeExists, runRule } from "./browser-helpers";

test.skip(!iifeExists, "IIFE bundle not built (run npm run build)");

async function runColorContrast(page: import("@playwright/test").Page) {
  return runRule(page, "distinguishable/color-contrast");
}

// ---------------------------------------------------------------------------
// Stylesheet-applied colors (not inline)
// ---------------------------------------------------------------------------
test.describe("Stylesheet-applied colors", () => {
  test("fails: class-applied low-contrast colors", async ({ page }) => {
    await page.setContent(`
      <style>.muted { color: #999; background: #aaa }</style>
      <p class="muted">Hard to read</p>
    `);
    const violations = await runColorContrast(page);
    expect(violations.length).toBeGreaterThan(0);
  });

  test("passes: class-applied high-contrast colors", async ({ page }) => {
    await page.setContent(`
      <style>.clear { color: #000; background: #fff }</style>
      <p class="clear">Easy to read</p>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });

  test("fails: ID selector-applied low-contrast colors", async ({ page }) => {
    await page.setContent(`
      <style>#low { color: #888; background: #999 }</style>
      <p id="low">Low contrast</p>
    `);
    const violations = await runColorContrast(page);
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Inherited styles
// ---------------------------------------------------------------------------
test.describe("Inherited styles", () => {
  test("fails: color inherited from body, low-contrast bg on child", async ({ page }) => {
    await page.setContent(`
      <style>body { color: #ccc } .box { background: #ddd }</style>
      <div class="box"><p>Inherited low contrast</p></div>
    `);
    const violations = await runColorContrast(page);
    expect(violations.length).toBeGreaterThan(0);
  });

  test("passes: color inherited from parent, good contrast with child bg", async ({ page }) => {
    await page.setContent(`
      <style>.parent { color: #000 } .child { background: #fff }</style>
      <div class="parent"><span class="child">Good contrast</span></div>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// UA stylesheet defaults (large text thresholds)
// ---------------------------------------------------------------------------
test.describe("UA stylesheet defaults", () => {
  test("passes: h1 is large text by default — uses 3:1 threshold", async ({ page }) => {
    // #808080 on white ≈ 3.95:1 — passes 3:1 (large text) but would fail 4.5:1 (normal text)
    await page.setContent(`
      <style>body { background: #fff }</style>
      <h1 style="color: #808080">Heading</h1>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });

  test("passes: bold text at 19px treated as large text", async ({ page }) => {
    // <b> is bold by UA default; 19px bold = large text → 3:1 threshold
    // #808080 on white ≈ 3.95:1 — passes 3:1 but would fail 4.5:1
    await page.setContent(`
      <style>body { background: #fff }</style>
      <p><b style="font-size: 19px; color: #808080">Bold large text</b></p>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });

  test("fails: small text at default size with low contrast", async ({ page }) => {
    // <small> is ~13px (80% of 16px) — normal text → 4.5:1 threshold
    // #888 on white ≈ 3.54:1, clearly below 4.5:1
    await page.setContent(`
      <style>body { background: #fff }</style>
      <p><small style="color: #888">Small print</small></p>
    `);
    const violations = await runColorContrast(page);
    expect(violations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Pseudo-element backgrounds
// ---------------------------------------------------------------------------
test.describe("Pseudo-element backgrounds", () => {
  test("skips: element with ::before providing background overlay", async ({ page }) => {
    await page.setContent(`
      <style>
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
    const violations = await runColorContrast(page);
    // Should skip — pseudo-element makes contrast unreliable
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Screen-reader-only via class (not inline)
// ---------------------------------------------------------------------------
test.describe("Screen-reader-only text", () => {
  test("skips: .sr-only with clip-rect pattern", async ({ page }) => {
    await page.setContent(`
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
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CSS specificity / cascade
// ---------------------------------------------------------------------------
test.describe("CSS specificity / cascade", () => {
  test("correct color wins: inline style overrides class", async ({ page }) => {
    // Class says low contrast, inline overrides to high contrast
    await page.setContent(`
      <style>.bad { color: #ccc; background: #ddd }</style>
      <p class="bad" style="color: #000; background: #fff">Inline wins</p>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });

  test("correct color wins: more specific selector overrides less specific", async ({ page }) => {
    await page.setContent(`
      <style>
        p { color: #ccc; background: #ddd }
        .container p.good { color: #000; background: #fff }
      </style>
      <div class="container"><p class="good">Specific wins</p></div>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Semi-transparent compositing in real browser
// ---------------------------------------------------------------------------
test.describe("Semi-transparent compositing", () => {
  test("passes: rgba background composited correctly over parent", async ({ page }) => {
    // White parent + semi-transparent dark child bg → effective dark bg
    // Black text on dark bg = good contrast
    await page.setContent(`
      <style>
        .parent { background: #fff }
        .child { background: rgba(0, 0, 0, 0.85); color: #fff }
      </style>
      <div class="parent"><p class="child">Composited bg</p></div>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Opacity inheritance
// ---------------------------------------------------------------------------
test.describe("Opacity inheritance", () => {
  test("skips: element with ancestor opacity: 0", async ({ page }) => {
    await page.setContent(`
      <style>
        .invisible { opacity: 0 }
        .text { color: #fff; background: #fff }
      </style>
      <div class="invisible"><p class="text">Zero opacity</p></div>
    `);
    const violations = await runColorContrast(page);
    expect(violations).toHaveLength(0);
  });
});
