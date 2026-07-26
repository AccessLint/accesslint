/**
 * Guards the `@accesslint/playwright/audit` entry point: it has to work
 * against raw `playwright` (here `playwright-core`), driven by code that never
 * loads `@playwright/test`. Importing the root entry instead would run
 * `expect.extend` at module load and fail outside the test runner.
 *
 * These tests drive their own browser rather than taking the `page` fixture,
 * so the assertions cover the real consumer shape.
 */
import { test, expect } from "@playwright/test";
import { chromium, type Browser, type Page } from "playwright-core";
import {
  accesslintAudit,
  auditFrames,
  auditShadowDom,
  ensureInjected,
  waitForPageSettle,
} from "./audit";

const MAIN_ORIGIN = "https://main.test";
const OTHER_ORIGIN = "https://other.test";

const CHILD_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Child</title></head>
<body><img src="child.png"></body>
</html>`;

const MAIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Frames</title></head>
<body>
  <main>
    <h1>Frames</h1>
    <iframe id="same" title="same origin" src="${MAIN_ORIGIN}/child.html"></iframe>
    <iframe id="cross" title="cross origin" src="${OTHER_ORIGIN}/child.html"></iframe>
  </main>
</body>
</html>`;

const SHADOW_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Shadow</title></head>
<body>
  <main><h1>Shadow</h1><div id="host"></div></main>
  <script>
    document.getElementById("host").attachShadow({ mode: "open" }).innerHTML =
      '<img src="shadow.png">';
  </script>
</body>
</html>`;

let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch();
});

test.afterAll(async () => {
  await browser?.close();
});

async function serve(page: Page, mainHtml: string): Promise<void> {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    await route.fulfill({
      contentType: "text/html",
      body: url.endsWith("/child.html") ? CHILD_HTML : mainHtml,
    });
  });
}

test("audits a raw playwright page without the test runner", async () => {
  const page = await browser.newPage();
  await serve(page, SHADOW_HTML);
  await page.goto(`${MAIN_ORIGIN}/`);

  await waitForPageSettle(page);
  const result = await accesslintAudit(page);

  expect(result.violations.some((v) => v.ruleId.includes("alt"))).toBe(true);
  await page.close();
});

test("auditShadowDom reports violations inside shadow roots", async () => {
  const page = await browser.newPage();
  await serve(page, SHADOW_HTML);
  await page.goto(`${MAIN_ORIGIN}/`);
  await ensureInjected(page);

  const violations = await auditShadowDom(page, {});

  expect(violations.length).toBeGreaterThan(0);
  expect(violations.every((v) => v.selector.includes(">>>"))).toBe(true);
  await page.close();
});

test("auditFrames covers both frames by default", async () => {
  const page = await browser.newPage();
  await serve(page, MAIN_HTML);
  await page.goto(`${MAIN_ORIGIN}/`);

  const violations = await auditFrames(page, false, {});

  expect(violations.filter((v) => v.selector.includes("#same")).length).toBeGreaterThan(0);
  expect(violations.filter((v) => v.selector.includes("#cross")).length).toBeGreaterThan(0);
  await page.close();
});

test("auditFrames skips cross-origin frames when sameOriginOnly is set", async () => {
  const page = await browser.newPage();
  await serve(page, MAIN_HTML);
  await page.goto(`${MAIN_ORIGIN}/`);

  const violations = await auditFrames(page, false, {}, { sameOriginOnly: true });

  expect(violations.filter((v) => v.selector.includes("#same")).length).toBeGreaterThan(0);
  expect(violations.filter((v) => v.selector.includes("#cross"))).toEqual([]);
  await page.close();
});
