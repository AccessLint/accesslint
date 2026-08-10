import { describe, it, expect, afterEach } from "vitest";
import { getSelector, clearSelectorCache } from "./selector";
import { makeDoc } from "../../test-helpers";

afterEach(() => clearSelectorCache());

/** Assert every element's selector resolves back to that same element. */
function expectResolvable(doc: Document, elements: Iterable<Element>): string[] {
  const selectors: string[] = [];
  for (const el of elements) {
    const selector = getSelector(el);
    selectors.push(selector);
    expect(doc.querySelectorAll(selector), selector).toHaveLength(1);
    expect(doc.querySelector(selector), selector).toBe(el);
  }
  return selectors;
}

describe("getSelector uniqueness", () => {
  it("disambiguates siblings that share an anchor attribute value", () => {
    const doc = makeDoc(
      `<nav>
        <div aria-label="Menu"><ul><div class="promo">P1</div></ul></div>
        <div aria-label="Menu"><ul><div class="promo">P2</div></ul></div>
      </nav>`,
    );
    const selectors = expectResolvable(doc, doc.querySelectorAll(".promo"));
    expect(new Set(selectors).size).toBe(2);
  });

  it("disambiguates a radio group sharing one name", () => {
    const doc = makeDoc(
      `<fieldset>
        <input type="radio" name="color" value="red">
        <input type="radio" name="color" value="green">
        <input type="radio" name="color" value="blue">
      </fieldset>`,
    );
    const selectors = expectResolvable(doc, doc.querySelectorAll("input"));
    expect(new Set(selectors).size).toBe(3);
  });

  it("disambiguates repeated links sharing one href", () => {
    const doc = makeDoc(
      `<ul>
        <li><a href="/docs"><span>Docs</span></a></li>
        <li><a href="/docs"><span>Documentation</span></a></li>
      </ul>`,
    );
    expectResolvable(doc, doc.querySelectorAll("a, a > span"));
  });
});

describe("getSelector stability", () => {
  it("keeps an attribute segment positional-free when the value is unique", () => {
    const doc = makeDoc(`<nav><div aria-label="Main"><a href="/a">A</a></div></nav>`);
    expect(getSelector(doc.querySelector("a")!)).toBe(`div[aria-label="Main"] > a[href="/a"]`);
  });

  // An ancestor with a duplicated anchor value is only worth pinning down when
  // the descendant's own path is ambiguous. Tightening it unconditionally
  // would trade a stable attribute path for a brittle positional one.
  it("leaves an ancestor unpinned when the descendant path already resolves", () => {
    const doc = makeDoc(
      `<nav>
        <div aria-label="Menu"><a href="/a">A</a></div>
        <div aria-label="Menu"><a href="/b">B</a></div>
      </nav>`,
    );
    const selectors = expectResolvable(doc, doc.querySelectorAll("a"));
    for (const selector of selectors) expect(selector).not.toContain("nth-of-type");
  });

  it("prefers a stable id over the positional path", () => {
    const doc = makeDoc(
      `<main>
        <div aria-label="Row" id="first"><span>A</span></div>
        <div aria-label="Row"><span>B</span></div>
      </main>`,
    );
    expect(getSelector(doc.querySelector("#first")!)).toBe("#first");
    expectResolvable(doc, doc.querySelectorAll("span"));
  });

  it("still indexes same-tag siblings that carry no anchor attribute", () => {
    const doc = makeDoc(`<main><p>one</p><p>two</p></main>`);
    expect(getSelector(doc.querySelectorAll("p")[1])).toContain("p:nth-of-type(2)");
  });
});
