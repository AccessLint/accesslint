import { test, expect } from "@playwright/test";
import { accesslintAudit } from "./index";

const ACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Accessible Page</title></head>
<body>
  <main>
    <h1>Hello World</h1>
    <p>This page is accessible.</p>
  </main>
</body>
</html>`;

const INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Inaccessible Page</title></head>
<body>
  <main>
    <img src="test.png">
    <h1>Hello World</h1>
  </main>
</body>
</html>`;

const IFRAME_INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Iframe Test</title></head>
<body>
  <main>
    <h1>Page with Iframe</h1>
    <iframe id="child" srcdoc="<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>Child</title></head><body><img src='test.png'></body></html>"></iframe>
  </main>
</body>
</html>`;

const IFRAME_SHADOW_DOM_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Iframe Shadow DOM Test</title></head>
<body>
  <main>
    <h1>Page with Iframe containing Shadow DOM</h1>
    <iframe id="child" srcdoc="<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><title>Child</title></head><body><div id='host'></div><script>document.getElementById('host').attachShadow({mode:'open'}).innerHTML='<img src=test.png>';</script></body></html>"></iframe>
  </main>
</body>
</html>`;

const SHADOW_DOM_INACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Shadow DOM Test</title></head>
<body>
  <main>
    <h1>Page with Shadow DOM</h1>
    <div id="host"></div>
  </main>
  <script>
    const host = document.getElementById('host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<img src="test.png">';
  </script>
</body>
</html>`;

const SHADOW_DOM_ACCESSIBLE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Accessible Shadow DOM</title></head>
<body>
  <main>
    <h1>Page with Accessible Shadow DOM</h1>
    <div id="host"></div>
  </main>
  <script>
    const host = document.getElementById('host');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<p>Accessible content</p>';
  </script>
</body>
</html>`;

const NESTED_SHADOW_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Nested Shadow Test</title></head>
<body>
  <main>
    <h1>Page with Nested Shadow DOM</h1>
    <div id="outer-host"></div>
  </main>
  <script>
    const outerHost = document.getElementById('outer-host');
    const outerShadow = outerHost.attachShadow({ mode: 'open' });
    outerShadow.innerHTML = '<div id="inner-host"></div>';
    const innerHost = outerShadow.querySelector('#inner-host');
    const innerShadow = innerHost.attachShadow({ mode: 'open' });
    innerShadow.innerHTML = '<img src="test.png">';
  </script>
</body>
</html>`;

const SCOPED_HTML = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Scoped Test</title></head>
<body>
  <main>
    <div id="good">
      <h2>Good Section</h2>
      <p>All accessible here.</p>
    </div>
    <div id="bad">
      <img src="bad.png">
    </div>
  </main>
</body>
</html>`;

test.describe("accesslintAudit", () => {
  test("accessible page has no violations", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    expect(result.violations).toHaveLength(0);
    expect(result.ruleCount).toBeGreaterThan(0);
  });

  test("inaccessible page has violations", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    expect(result.violations.length).toBeGreaterThan(0);
    const ruleIds = result.violations.map((v) => v.ruleId);
    // accesslint-011 = img missing alt, accesslint-080 = html missing lang
    expect(ruleIds).toContain("text-alternatives/img-alt");
    expect(ruleIds).toContain("readable/html-has-lang");
  });

  test("violations do not contain element property", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    for (const v of result.violations) {
      expect(v).not.toHaveProperty("element");
    }
  });

  test("locator scoping — good section has no violations", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    const result = await accesslintAudit(page.locator("#good"));
    expect(result.violations).toHaveLength(0);
  });

  test("locator scoping — bad section has violations", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    const result = await accesslintAudit(page.locator("#bad"));
    expect(result.violations.length).toBeGreaterThan(0);
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("disabledRules filters out specified rules", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page, {
      disabledRules: ["text-alternatives/img-alt"],
    });
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).not.toContain("text-alternatives/img-alt");
    // accesslint-080 (html-has-lang) should still be present
    expect(ruleIds).toContain("readable/html-has-lang");
  });

  test("re-injection guard — no duplicate script tags", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    await accesslintAudit(page);
    await accesslintAudit(page);
    const scriptCount = await page.evaluate(() => document.querySelectorAll("script").length);
    expect(scriptCount).toBe(1);
  });

  test("failOn=critical filters out non-critical violations", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const baseline = await accesslintAudit(page);
    const filtered = await accesslintAudit(page, { failOn: "critical" });
    expect(baseline.violations.length).toBeGreaterThan(0);
    for (const v of filtered.violations) {
      expect(v.impact).toBe("critical");
    }
  });

  test("failOn=serious still returns critical violations", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page, { failOn: "serious" });
    const ruleIds = result.violations.map((v) => v.ruleId);
    // img-alt is critical — survives a "serious" threshold
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("includeAAA=true runs AAA-level rules", async ({ page }) => {
    // Low-contrast text to trigger the AAA enhanced contrast rule
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><title>AAA</title></head>
      <body><main><h1>Hi</h1><p style="color:#888;background:#fff">low contrast</p></main></body>
      </html>`);

    const withoutAAA = await accesslintAudit(page);
    const withAAA = await accesslintAudit(page, { includeAAA: true });

    const aaaRuleId = "distinguishable/color-contrast-enhanced";
    expect(withoutAAA.violations.map((v) => v.ruleId)).not.toContain(aaaRuleId);
    expect(withAAA.ruleCount).toBeGreaterThan(withoutAAA.ruleCount);
  });

  test("componentMode=true skips page-level rules on a Page", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML); // no <html lang>, triggers html-has-lang
    const full = await accesslintAudit(page);
    const component = await accesslintAudit(page, { componentMode: true });
    expect(full.violations.map((v) => v.ruleId)).toContain("readable/html-has-lang");
    expect(component.violations.map((v) => v.ruleId)).not.toContain("readable/html-has-lang");
  });

  test("componentMode defaults to true for Locator targets", async ({ page }) => {
    // INACCESSIBLE_HTML has both a missing <html lang> (page-level rule) and
    // an <img> without alt inside <main>. A locator-scoped audit should skip
    // page-level rules by default, so html-has-lang must not appear.
    await page.setContent(INACCESSIBLE_HTML);
    const result = await accesslintAudit(page.locator("main"));
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).not.toContain("readable/html-has-lang");
  });

  test("locale is forwarded to the core audit", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    // Smoke test: passing a locale doesn't throw and returns violations.
    const result = await accesslintAudit(page, { locale: "en" });
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

test.describe("iframe auditing", () => {
  test("finds violations inside srcdoc iframe", async ({ page }) => {
    await page.setContent(IFRAME_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("violation selectors include >>>iframe> prefix", async ({ page }) => {
    await page.setContent(IFRAME_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    const iframeViolations = result.violations.filter((v) => v.selector.includes(">>>iframe>"));
    expect(iframeViolations.length).toBeGreaterThan(0);
  });

  test("finds shadow DOM violations inside iframe", async ({ page }) => {
    await page.setContent(IFRAME_SHADOW_DOM_HTML);
    const result = await accesslintAudit(page);
    const violations = result.violations.filter(
      (v) => v.selector.includes(">>>iframe>") && v.selector.includes(">>>"),
    );
    expect(violations.length).toBeGreaterThan(0);
    const ruleIds = violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("includeFrames: false skips iframe violations", async ({ page }) => {
    await page.setContent(IFRAME_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page, { includeFrames: false });
    const iframeViolations = result.violations.filter((v) => v.selector.includes(">>>iframe>"));
    expect(iframeViolations).toHaveLength(0);
  });
});

test.describe("shadow DOM auditing", () => {
  test("finds violations inside open shadow root", async ({ page }) => {
    await page.setContent(SHADOW_DOM_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("violation selectors include >>> delimiter", async ({ page }) => {
    await page.setContent(SHADOW_DOM_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    const shadowViolations = result.violations.filter(
      (v) => v.selector.includes(">>>") && !v.selector.includes(">>>iframe>"),
    );
    expect(shadowViolations.length).toBeGreaterThan(0);
  });

  test("nested shadow roots work", async ({ page }) => {
    await page.setContent(NESTED_SHADOW_HTML);
    const result = await accesslintAudit(page);
    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds).toContain("text-alternatives/img-alt");
  });

  test("includeShadowDom: false skips shadow DOM violations", async ({ page }) => {
    await page.setContent(SHADOW_DOM_INACCESSIBLE_HTML);
    const result = await accesslintAudit(page, { includeShadowDom: false });
    const shadowViolations = result.violations.filter(
      (v) => v.selector.includes(">>>") && !v.selector.includes(">>>iframe>"),
    );
    expect(shadowViolations).toHaveLength(0);
  });

  test("accessible shadow content has no violations", async ({ page }) => {
    await page.setContent(SHADOW_DOM_ACCESSIBLE_HTML);
    const result = await accesslintAudit(page);
    expect(result.violations).toHaveLength(0);
  });
});

test.describe("toBeAccessible matcher", () => {
  test("passes for accessible page", async ({ page }) => {
    await page.setContent(ACCESSIBLE_HTML);
    await expect(page).toBeAccessible();
  });

  test("fails for inaccessible page", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    await expect(page).not.toBeAccessible();
  });

  test("works with locator", async ({ page }) => {
    await page.setContent(SCOPED_HTML);
    await expect(page.locator("#good")).toBeAccessible();
    await expect(page.locator("#bad")).not.toBeAccessible();
  });

  test("respects disabledRules", async ({ page }) => {
    await page.setContent(INACCESSIBLE_HTML);
    // Disable all known violations — should pass
    await expect(page).toBeAccessible({
      disabledRules: ["text-alternatives/img-alt", "readable/html-has-lang"],
    });
  });

  test("fails when iframe content is inaccessible", async ({ page }) => {
    await page.setContent(IFRAME_INACCESSIBLE_HTML);
    await expect(page).not.toBeAccessible();
  });

  test("fails when shadow DOM content is inaccessible", async ({ page }) => {
    await page.setContent(SHADOW_DOM_INACCESSIBLE_HTML);
    await expect(page).not.toBeAccessible();
  });
});
