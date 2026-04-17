import { describe, it, expect } from "vitest";
import { inlineCSS } from "./inline-css";

describe("inlineCSS", () => {
  it("returns the input unchanged when there are no stylesheet links", async () => {
    const html = "<!DOCTYPE html><html><body><p>hi</p></body></html>";
    const out = await inlineCSS(html, "https://example.com/");
    expect(out).toBe(html);
  });

  it("leaves data: URI stylesheets alone", async () => {
    const html =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="data:text/css,body{color:red}"></head><body></body></html>';
    const out = await inlineCSS(html, "https://example.com/");
    // data: links are skipped (not fetched, not replaced); <link> survives
    expect(out).toContain('href="data:text/css,body{color:red}"');
  });

  it("skips non-http(s) resolved URLs (e.g. file:// from relative href)", async () => {
    const html =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="./styles.css"></head><body></body></html>';
    // file:// baseURL — the relative href resolves to file://, which is skipped.
    const out = await inlineCSS(html, "file:///tmp/");
    expect(out).toContain("./styles.css");
  });

  it("skips links with malformed hrefs", async () => {
    const html =
      '<!DOCTYPE html><html><head><link rel="stylesheet" href="http://[:::::]/x.css"></head><body></body></html>';
    const out = await inlineCSS(html, "https://example.com/");
    expect(out).toContain("http://[:::::]/x.css");
  });
});
