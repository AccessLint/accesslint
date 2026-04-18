import { describe, it, expect } from "vitest";
import { normalizeHtml, sha1Short, dhash } from "./normalize";

describe("normalizeHtml", () => {
  it("is invariant under whitespace", () => {
    const a = normalizeHtml('<img    alt="hi"    src="x">');
    const b = normalizeHtml('<img alt="hi" src="x">');
    expect(a).toBe(b);
  });

  it("is invariant under attribute order", () => {
    const a = normalizeHtml('<img src="x" alt="hi">');
    const b = normalizeHtml('<img alt="hi" src="x">');
    expect(a).toBe(b);
  });

  it("lowercases tag names", () => {
    const a = normalizeHtml('<IMG alt="x">');
    const b = normalizeHtml('<img alt="x">');
    expect(a).toBe(b);
  });

  it("drops class and style attributes", () => {
    const a = normalizeHtml('<img alt="x" class="foo bar" style="color:red">');
    const b = normalizeHtml('<img alt="x">');
    expect(a).toBe(b);
  });

  it("drops React-generated ids", () => {
    const a = normalizeHtml('<input id=":r3:" type="text">');
    const b = normalizeHtml('<input type="text">');
    expect(a).toBe(b);
  });

  it("drops long-hex generated ids", () => {
    const a = normalizeHtml('<div id="a3f2b9c4d1e5">');
    const b = normalizeHtml("<div>");
    expect(a).toBe(b);
  });

  it("keeps semantic attributes like alt, href, aria-*", () => {
    const out = normalizeHtml('<a href="/x" aria-label="go">x</a>');
    expect(out).toContain('href="/x"');
    expect(out).toContain('aria-label="go"');
  });

  it("is sensitive to tag changes", () => {
    expect(normalizeHtml("<button>x</button>")).not.toBe(normalizeHtml("<a>x</a>"));
  });

  it("is sensitive to text changes", () => {
    expect(normalizeHtml("<p>alpha</p>")).not.toBe(normalizeHtml("<p>beta</p>"));
  });

  it("truncates text to 64 chars per node", () => {
    const long = "a".repeat(200);
    const out = normalizeHtml(`<p>${long}</p>`);
    expect(out).toBe(`<p>${"a".repeat(64)}</p>`);
  });
});

describe("sha1Short", () => {
  it("produces 12 hex chars", () => {
    const h = sha1Short("hello");
    expect(h).toMatch(/^[a-f0-9]{12}$/);
  });

  it("is deterministic", () => {
    expect(sha1Short("x")).toBe(sha1Short("x"));
  });

  it("is sensitive to input", () => {
    expect(sha1Short("a")).not.toBe(sha1Short("b"));
  });
});

describe("dhash", () => {
  it("produces a 16-char hex string", () => {
    const pixels = new Uint8Array(9 * 8);
    for (let i = 0; i < pixels.length; i++) pixels[i] = i * 3;
    const hash = dhash(pixels);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it("throws on wrong-sized input", () => {
    expect(() => dhash(new Uint8Array(10))).toThrow(/9x8/);
  });

  it("equal images produce equal hashes", () => {
    const a = new Uint8Array(9 * 8).fill(50);
    const b = new Uint8Array(9 * 8).fill(50);
    expect(dhash(a)).toBe(dhash(b));
  });

  it("differing images produce differing hashes", () => {
    const a = new Uint8Array(9 * 8);
    const b = new Uint8Array(9 * 8);
    for (let i = 0; i < a.length; i++) {
      a[i] = i;
      b[i] = 255 - i;
    }
    expect(dhash(a)).not.toBe(dhash(b));
  });
});
