/**
 * Oracle test: assert that core's getResilientLocator() agrees with
 * Playwright's own locator.normalize() (v1.59+) on real DOMs. This is how we
 * "lean on" Playwright's selector intelligence — as a CI correctness check,
 * never a runtime dependency. If a future Playwright version changes how it
 * normalizes, this test surfaces the divergence so core's ladder can be
 * realigned.
 */
import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const iifePath = require.resolve("@accesslint/core/iife");

async function inject(page: import("@playwright/test").Page, html: string): Promise<void> {
  await page.setContent(html);
  await page.addScriptTag({ path: iifePath });
}

function coreLocator(page: import("@playwright/test").Page, css: string): Promise<string> {
  return page.evaluate(
    (sel) =>
      (
        window as unknown as { AccessLint: { getResilientLocator(el: Element): string } }
      ).AccessLint.getResilientLocator(document.querySelector(sel)!),
    css,
  );
}

const FIXTURE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Oracle</title></head>
<body>
  <main>
    <nav aria-label="Primary"><a href="/home">Home</a></nav>
    <h1>Dashboard</h1>
    <form>
      <label for="email">Email</label><input id="email" type="email">
      <button type="submit">Submit</button>
    </form>
    <button data-testid="save-btn">Save</button>
    <a href="/docs">Documentation</a>
  </main>
</body>
</html>`;

const CASES = [
  { css: "nav", label: "named landmark" },
  { css: "h1", label: "heading" },
  { css: "#email", label: "labeled input" },
  { css: "button[type=submit]", label: "submit button" },
  { css: "button[data-testid=save-btn]", label: "testid button" },
  { css: "a[href='/docs']", label: "link" },
];

test("core getResilientLocator matches Playwright normalize() on unique elements", async ({
  page,
}) => {
  await inject(page, FIXTURE);

  const rows: { label: string; core: string; normalize: string; same: boolean }[] = [];
  for (const c of CASES) {
    const core = await coreLocator(page, c.css);
    const loc = page.locator(c.css);
    expect(
      typeof (loc as { normalize?: unknown }).normalize,
      "this test requires Playwright >= 1.59 (locator.normalize)",
    ).toBe("function");
    const normalize = (await loc.normalize()).toString();
    rows.push({ label: c.label, core, normalize, same: core === normalize });
  }

  console.table(rows);

  for (const r of rows) {
    expect(r.core, `${r.label}: core diverged from Playwright normalize()`).toBe(r.normalize);
  }
});

test("ambiguous elements get a stable (non-unique) locator by design", async ({ page }) => {
  // Two identical buttons. Core intentionally emits the SAME stable locator for
  // both — the diff engine matches duplicates by count, so this is correct and
  // far more stable than a positional nth-of-type. (Playwright's normalize()
  // instead disambiguates with .first()/.nth(); we log that for visibility.)
  await inject(
    page,
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Dupes</title></head>
     <body><main>
       <li>Item A <button>Delete</button></li>
       <li>Item B <button>Delete</button></li>
     </main></body></html>`,
  );

  const first = await coreLocator(page, "li:nth-child(1) button");
  const second = await coreLocator(page, "li:nth-child(2) button");

  expect(first).toBe(`getByRole('button', { name: 'Delete' })`);
  expect(second).toBe(first);

  console.log("normalize() disambiguation:", [
    (await page.locator("li:nth-child(1) button").normalize()).toString(),
    (await page.locator("li:nth-child(2) button").normalize()).toString(),
  ]);
});
