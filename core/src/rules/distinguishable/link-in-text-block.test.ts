import { describe, it, expect, afterEach } from "vitest";
import { makeDoc } from "../../test-helpers";
import { linkInTextBlock } from "./link-in-text-block";
import { clearColorCaches } from "../utils/color";


describe("distinguishable/link-in-text-block", () => {
  afterEach(() => {
    clearColorCaches();
  });

  // --- Pass cases ---

  it("passes: link with underline", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: underline;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link with border-bottom", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; border-bottom: 1px solid black;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link with bold (font-weight difference >= 300)", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0); font-weight: 400;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-weight: 700;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link with italic font-style", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0); font-style: normal;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-style: italic;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link with sufficient 3:1 contrast with surrounding text", () => {
    // Blue (#0000ff) on black (#000000): blue luminance ~0.0722, black ~0
    // ratio = (0.0722 + 0.05) / (0 + 0.05) = 2.44 — not enough
    // Use a brighter contrast: #0066cc on #000000
    // Let's use red (#ff0000) on black — red luminance = 0.2126, ratio = (0.2126+0.05)/(0+0.05) = 5.25
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(255,0,0); text-decoration: none;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link is the sole content in block (no surrounding text)", () => {
    const doc = makeDoc(
      '<body><p><a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link only</a></p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: block-level link (display: block)", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text</p><a href="/page" style="display: block; color: rgb(0,0,0); text-decoration: none;">block link</a></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: aria-hidden link", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" aria-hidden="true" style="color: rgb(0,0,0); text-decoration: none;">hidden</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link inside nav landmark", () => {
    const doc = makeDoc(
      '<body><nav><p style="color: rgb(0,0,0);">Menu <a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></p></nav></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link inside role=navigation", () => {
    const doc = makeDoc(
      '<body><div role="navigation"><p style="color: rgb(0,0,0);">Menu <a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></p></div></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link in list with no non-link text in immediate block", () => {
    const doc = makeDoc(
      '<body><ul><li><a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></li></ul></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link list separated by pipe characters", () => {
    const doc = makeDoc(
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">Home</a> | <a href="/b" style="color: rgb(0,0,0); text-decoration: none;">About</a> | <a href="/c" style="color: rgb(0,0,0); text-decoration: none;">Contact</a></div></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link list with CJK punctuation separators", () => {
    const doc = makeDoc(
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">首页</a>｜<a href="/b" style="color: rgb(0,0,0); text-decoration: none;">关于</a></div></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link list separated by middot", () => {
    const doc = makeDoc(
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">Privacy</a> · <a href="/b" style="color: rgb(0,0,0); text-decoration: none;">Terms</a></div></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link inside footer element", () => {
    const doc = makeDoc(
      '<body><footer><p style="color: rgb(0,0,0);">Copyright 2024 <a href="/privacy" style="color: rgb(0,0,0); text-decoration: none;">Privacy</a></p></footer></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link inside header element", () => {
    const doc = makeDoc(
      '<body><header><p style="color: rgb(0,0,0);">Welcome back <a href="/profile" style="color: rgb(0,0,0); text-decoration: none;">User</a></p></header></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: image-only link (no text content)", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="text-decoration: none;"><img src="icon.png" alt=""></a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link with larger font size (1.2x ratio)", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0); font-size: 16px;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-size: 20px;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: link and text have identical colors (allowSameColor)", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration-line: none;">link</a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: descendant element has underline", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(50,50,50); text-decoration: none;"><span style="text-decoration: underline;">link</span></a> more text</p></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  it("passes: short metadata label with identical color (allowSameColor)", () => {
    const doc = makeDoc(
      '<body><div style="color: rgb(0,0,0);">Producent: <a href="/brand" style="color: rgb(0,0,0); text-decoration: none;">Brand Name</a></div></body>'
    );
    expect(linkInTextBlock.run(doc)).toHaveLength(0);
  });

  // --- Fail cases ---

  it("fails: no underline, low contrast with surrounding text", () => {
    // rgb(50,50,50) on rgb(0,0,0): ~1.6:1 contrast — below 3:1 threshold
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">link</a> more text</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("distinguishable/link-in-text-block");
    expect(violations[0].impact).toBe("serious");
  });

  it("fails: no visual distinction with less than 3:1 contrast", () => {
    // rgb(0,0,0) vs rgb(30,30,30): both very dark, ratio close to 1:1
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(30,30,30); text-decoration-line: none;">link</a> more text</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].context).toContain("ratio:");
    expect(violations[0].context).toContain("link color:");
    expect(violations[0].context).toContain("surrounding text:");
  });

  it("fails: CJK text block with low-contrast link", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">这是一段中文文本 <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">链接</a> 更多文本</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("distinguishable/link-in-text-block");
  });

  it("fails: Cyrillic text block with low-contrast link", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">Это текст <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">ссылка</a> ещё текст</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("fails: Arabic text block with low-contrast link", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(0,0,0);">هذا نص <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">رابط</a> مزيد</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("fails: text-decoration: none with low-contrast color", () => {
    const doc = makeDoc(
      '<body><p style="color: rgb(100,100,100);">Paragraph text <a href="/page" style="color: rgb(130,130,130); text-decoration: none;">link text</a> and more</p></body>'
    );
    const violations = linkInTextBlock.run(doc);
    expect(violations).toHaveLength(1);
  });

});
