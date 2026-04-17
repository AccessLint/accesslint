import { describe, it, afterEach } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { linkInTextBlock } from "./link-in-text-block";
import { clearColorCaches } from "../utils/color";

const RULE_ID = "distinguishable/link-in-text-block";

describe(RULE_ID, () => {
  afterEach(() => {
    clearColorCaches();
  });

  // --- Pass cases ---

  it("passes: link with underline", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: underline;">link</a> more text</p></body>',
    );
  });

  it("passes: link with border-bottom", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; border-bottom: 1px solid black;">link</a> more text</p></body>',
    );
  });

  it("passes: link with bold (font-weight difference >= 300)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0); font-weight: 400;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-weight: 700;">link</a> more text</p></body>',
    );
  });

  it("passes: link with italic font-style", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0); font-style: normal;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-style: italic;">link</a> more text</p></body>',
    );
  });

  it("passes: link with sufficient 3:1 contrast with surrounding text", () => {
    // Blue (#0000ff) on black (#000000): blue luminance ~0.0722, black ~0
    // ratio = (0.0722 + 0.05) / (0 + 0.05) = 2.44 — not enough
    // Use a brighter contrast: #0066cc on #000000
    // Let's use red (#ff0000) on black — red luminance = 0.2126, ratio = (0.2126+0.05)/(0+0.05) = 5.25
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(255,0,0); text-decoration: none;">link</a> more text</p></body>',
    );
  });

  it("passes: link is the sole content in block (no surrounding text)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p><a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link only</a></p></body>',
    );
  });

  it("passes: block-level link (display: block)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text</p><a href="/page" style="display: block; color: rgb(0,0,0); text-decoration: none;">block link</a></body>',
    );
  });

  it("passes: aria-hidden link", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" aria-hidden="true" style="color: rgb(0,0,0); text-decoration: none;">hidden</a> more text</p></body>',
    );
  });

  it("passes: link inside nav landmark", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><nav><p style="color: rgb(0,0,0);">Menu <a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></p></nav></body>',
    );
  });

  it("passes: link inside role=navigation", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><div role="navigation"><p style="color: rgb(0,0,0);">Menu <a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></p></div></body>',
    );
  });

  it("passes: link in list with no non-link text in immediate block", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><ul><li><a href="/page" style="color: rgb(0,0,0); text-decoration: none;">link</a></li></ul></body>',
    );
  });

  it("passes: link list separated by pipe characters", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">Home</a> | <a href="/b" style="color: rgb(0,0,0); text-decoration: none;">About</a> | <a href="/c" style="color: rgb(0,0,0); text-decoration: none;">Contact</a></div></body>',
    );
  });

  it("passes: link list with CJK punctuation separators", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">首页</a>｜<a href="/b" style="color: rgb(0,0,0); text-decoration: none;">关于</a></div></body>',
    );
  });

  it("passes: link list separated by middot", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><div style="color: rgb(0,0,0);"><a href="/a" style="color: rgb(0,0,0); text-decoration: none;">Privacy</a> · <a href="/b" style="color: rgb(0,0,0); text-decoration: none;">Terms</a></div></body>',
    );
  });

  it("passes: link inside footer element", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><footer><p style="color: rgb(0,0,0);">Copyright 2024 <a href="/privacy" style="color: rgb(0,0,0); text-decoration: none;">Privacy</a></p></footer></body>',
    );
  });

  it("passes: link inside header element", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><header><p style="color: rgb(0,0,0);">Welcome back <a href="/profile" style="color: rgb(0,0,0); text-decoration: none;">User</a></p></header></body>',
    );
  });

  it("passes: image-only link (no text content)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="text-decoration: none;"><img src="icon.png" alt=""></a> more text</p></body>',
    );
  });

  it("passes: link with larger font size (1.2x ratio)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0); font-size: 16px;">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration: none; font-size: 20px;">link</a> more text</p></body>',
    );
  });

  it("passes: link and text have identical colors (allowSameColor)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(0,0,0); text-decoration-line: none;">link</a> more text</p></body>',
    );
  });

  it("passes: descendant element has underline", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(50,50,50); text-decoration: none;"><span style="text-decoration: underline;">link</span></a> more text</p></body>',
    );
  });

  it("passes: short metadata label with identical color (allowSameColor)", () => {
    expectNoViolations(
      linkInTextBlock,
      '<body><div style="color: rgb(0,0,0);">Producent: <a href="/brand" style="color: rgb(0,0,0); text-decoration: none;">Brand Name</a></div></body>',
    );
  });

  // --- Fail cases ---

  it("fails: no underline, low contrast with surrounding text", () => {
    // rgb(50,50,50) on rgb(0,0,0): ~1.6:1 contrast — below 3:1 threshold
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">link</a> more text</p></body>',
      { count: 1, ruleId: RULE_ID, impact: "serious" },
    );
  });

  it("fails: no visual distinction with less than 3:1 contrast", () => {
    // rgb(0,0,0) vs rgb(30,30,30): both very dark, ratio close to 1:1
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Some text <a href="/page" style="color: rgb(30,30,30); text-decoration-line: none;">link</a> more text</p></body>',
      {
        count: 1,
        ruleId: RULE_ID,
        contextMatches: /link color:.*surrounding text:.*ratio:/s,
      },
    );
  });

  it("fails: CJK text block with low-contrast link", () => {
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">这是一段中文文本 <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">链接</a> 更多文本</p></body>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("fails: Cyrillic text block with low-contrast link", () => {
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">Это текст <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">ссылка</a> ещё текст</p></body>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("fails: Arabic text block with low-contrast link", () => {
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(0,0,0);">هذا نص <a href="/page" style="color: rgb(50,50,50); text-decoration-line: none;">رابط</a> مزيد</p></body>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("fails: text-decoration: none with low-contrast color", () => {
    expectViolations(
      linkInTextBlock,
      '<body><p style="color: rgb(100,100,100);">Paragraph text <a href="/page" style="color: rgb(130,130,130); text-decoration: none;">link text</a> and more</p></body>',
      { count: 1, ruleId: RULE_ID },
    );
  });
});
