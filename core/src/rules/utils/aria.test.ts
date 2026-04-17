import { describe, it, expect, afterEach } from "vitest";
import { makeDoc } from "../../test-helpers";
import {
  getImplicitRole,
  getComputedRole,
  getAccessibleName,
  getAccessibleTextContent,
  isAriaHidden,
  isComputedHidden,
  isValidRole,
  isValidAriaAttribute,
  getVisibleText,
  isVisibilityHidden,
  getExplicitAccessibleName,
  isInShadowDOM,
  clearComputedRoleCache,
  clearAccessibleNameCache,
  clearAriaHiddenCache,
} from "./aria";

afterEach(() => {
  clearComputedRoleCache();
  clearAccessibleNameCache();
  clearAriaHiddenCache();
});

// ---------------------------------------------------------------------------
// getImplicitRole
// ---------------------------------------------------------------------------

describe("getImplicitRole", () => {
  it("returns 'link' for <a href>", () => {
    const doc = makeDoc(`<a href="/foo">Link</a>`);
    expect(getImplicitRole(doc.querySelector("a")!)).toBe("link");
  });

  it("returns null for <a> without href", () => {
    const doc = makeDoc(`<a>Anchor</a>`);
    expect(getImplicitRole(doc.querySelector("a")!)).toBeNull();
  });

  it("returns 'link' for <area href>", () => {
    const doc = makeDoc(`<map><area href="/foo" alt="area"></map>`);
    expect(getImplicitRole(doc.querySelector("area")!)).toBe("link");
  });

  it("returns 'button' for <button>", () => {
    const doc = makeDoc(`<button>Click</button>`);
    expect(getImplicitRole(doc.querySelector("button")!)).toBe("button");
  });

  it("returns 'heading' for h1–h6", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const doc = makeDoc(`<h${level}>Heading</h${level}>`);
      expect(getImplicitRole(doc.querySelector(`h${level}`)!)).toBe("heading");
    }
  });

  it("returns 'img' for <img> with alt text", () => {
    const doc = makeDoc(`<img src="x.png" alt="Photo">`);
    expect(getImplicitRole(doc.querySelector("img")!)).toBe("img");
  });

  it("returns 'presentation' for <img alt=''>", () => {
    const doc = makeDoc(`<img src="x.png" alt="">`);
    expect(getImplicitRole(doc.querySelector("img")!)).toBe("presentation");
  });

  it("returns 'textbox' for <input> (default type)", () => {
    const doc = makeDoc(`<input>`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("textbox");
  });

  it("returns 'checkbox' for <input type=checkbox>", () => {
    const doc = makeDoc(`<input type="checkbox">`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("checkbox");
  });

  it("returns 'radio' for <input type=radio>", () => {
    const doc = makeDoc(`<input type="radio">`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("radio");
  });

  it("returns 'button' for <input type=submit>", () => {
    const doc = makeDoc(`<input type="submit">`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("button");
  });

  it("returns 'slider' for <input type=range>", () => {
    const doc = makeDoc(`<input type="range">`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("slider");
  });

  it("returns 'spinbutton' for <input type=number>", () => {
    const doc = makeDoc(`<input type="number">`);
    expect(getImplicitRole(doc.querySelector("input")!)).toBe("spinbutton");
  });

  it("returns 'list' for <ul> and <ol>", () => {
    const doc = makeDoc(`<ul><li>A</li></ul><ol><li>B</li></ol>`);
    expect(getImplicitRole(doc.querySelector("ul")!)).toBe("list");
    expect(getImplicitRole(doc.querySelector("ol")!)).toBe("list");
  });

  it("returns 'listitem' for <li> inside a list", () => {
    const doc = makeDoc(`<ul><li>Item</li></ul>`);
    expect(getImplicitRole(doc.querySelector("li")!)).toBe("listitem");
  });

  it("returns null for <li> outside a list", () => {
    const doc = makeDoc(`<li>Orphan</li>`);
    expect(getImplicitRole(doc.querySelector("li")!)).toBeNull();
  });

  it("returns 'navigation' for <nav>", () => {
    const doc = makeDoc(`<nav>Nav</nav>`);
    expect(getImplicitRole(doc.querySelector("nav")!)).toBe("navigation");
  });

  it("returns 'main' for <main>", () => {
    const doc = makeDoc(`<main>Main</main>`);
    expect(getImplicitRole(doc.querySelector("main")!)).toBe("main");
  });

  it("returns 'banner' for <header> at top level", () => {
    const doc = makeDoc(`<header>Header</header>`);
    expect(getImplicitRole(doc.querySelector("header")!)).toBe("banner");
  });

  it("returns null for <header> inside <main>", () => {
    const doc = makeDoc(`<main><header>Section header</header></main>`);
    expect(getImplicitRole(doc.querySelector("header")!)).toBeNull();
  });

  it("returns 'contentinfo' for <footer> at top level", () => {
    const doc = makeDoc(`<footer>Footer</footer>`);
    expect(getImplicitRole(doc.querySelector("footer")!)).toBe("contentinfo");
  });

  it("returns null for <footer> inside <article>", () => {
    const doc = makeDoc(`<article><footer>Article footer</footer></article>`);
    expect(getImplicitRole(doc.querySelector("footer")!)).toBeNull();
  });

  it("returns 'region' for <section> with aria-label", () => {
    const doc = makeDoc(`<section aria-label="Products">Content</section>`);
    expect(getImplicitRole(doc.querySelector("section")!)).toBe("region");
  });

  it("returns null for <section> without label", () => {
    const doc = makeDoc(`<section>Content</section>`);
    expect(getImplicitRole(doc.querySelector("section")!)).toBeNull();
  });

  it("returns 'combobox' for <select> (single)", () => {
    const doc = makeDoc(`<select><option>A</option></select>`);
    expect(getImplicitRole(doc.querySelector("select")!)).toBe("combobox");
  });

  it("returns 'listbox' for <select multiple>", () => {
    const doc = makeDoc(`<select multiple><option>A</option></select>`);
    expect(getImplicitRole(doc.querySelector("select")!)).toBe("listbox");
  });

  it("returns 'table' for <table>", () => {
    const doc = makeDoc(`<table><tr><td>Cell</td></tr></table>`);
    expect(getImplicitRole(doc.querySelector("table")!)).toBe("table");
  });

  it("returns null for unknown elements", () => {
    const doc = makeDoc(`<div>Block</div>`);
    expect(getImplicitRole(doc.querySelector("div")!)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getComputedRole
// ---------------------------------------------------------------------------

describe("getComputedRole", () => {
  it("returns explicit role attribute when present", () => {
    const doc = makeDoc(`<div role="button">Div button</div>`);
    expect(getComputedRole(doc.querySelector("div")!)).toBe("button");
  });

  it("falls back to implicit role when no explicit role", () => {
    const doc = makeDoc(`<nav>Nav</nav>`);
    expect(getComputedRole(doc.querySelector("nav")!)).toBe("navigation");
  });

  it("returns null for element with no explicit or implicit role", () => {
    const doc = makeDoc(`<div>Block</div>`);
    expect(getComputedRole(doc.querySelector("div")!)).toBeNull();
  });

  it("caches results across calls", () => {
    const doc = makeDoc(`<nav>Nav</nav>`);
    const el = doc.querySelector("nav")!;
    const first = getComputedRole(el);
    const second = getComputedRole(el);
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// getAccessibleName
// ---------------------------------------------------------------------------

describe("getAccessibleName", () => {
  it("uses aria-labelledby when present", () => {
    const doc = makeDoc(`<span id="lbl">Label text</span><button aria-labelledby="lbl">btn</button>`);
    expect(getAccessibleName(doc.querySelector("button")!)).toBe("Label text");
  });

  it("uses aria-label when present", () => {
    const doc = makeDoc(`<button aria-label="Close dialog">X</button>`);
    expect(getAccessibleName(doc.querySelector("button")!)).toBe("Close dialog");
  });

  it("uses label[for] for inputs", () => {
    const doc = makeDoc(`<label for="name">Full name</label><input id="name">`);
    expect(getAccessibleName(doc.querySelector("input")!)).toBe("Full name");
  });

  it("uses parent <label> for inputs", () => {
    const doc = makeDoc(`<label>Email <input type="email"></label>`);
    expect(getAccessibleName(doc.querySelector("input")!)).toBe("Email");
  });

  it("uses title attribute as fallback", () => {
    const doc = makeDoc(`<button title="Delete item">🗑</button>`);
    expect(getAccessibleName(doc.querySelector("button")!)).toBe("Delete item");
  });

  it("uses placeholder as fallback for input", () => {
    const doc = makeDoc(`<input placeholder="Search...">`);
    expect(getAccessibleName(doc.querySelector("input")!)).toBe("Search...");
  });

  it("uses legend for fieldset", () => {
    const doc = makeDoc(`<fieldset><legend>Shipping address</legend><input></fieldset>`);
    expect(getAccessibleName(doc.querySelector("fieldset")!)).toBe("Shipping address");
  });

  it("uses caption for table", () => {
    const doc = makeDoc(`<table><caption>Sales data</caption><tr><td>1</td></tr></table>`);
    expect(getAccessibleName(doc.querySelector("table")!)).toBe("Sales data");
  });

  it("uses alt for <img>", () => {
    const doc = makeDoc(`<img src="x.png" alt="Company logo">`);
    expect(getAccessibleName(doc.querySelector("img")!)).toBe("Company logo");
  });

  it("uses alt for input[type=image]", () => {
    const doc = makeDoc(`<input type="image" alt="Submit form">`);
    expect(getAccessibleName(doc.querySelector("input")!)).toBe("Submit form");
  });

  it("uses text content for non-input elements", () => {
    const doc = makeDoc(`<button>Save changes</button>`);
    expect(getAccessibleName(doc.querySelector("button")!)).toBe("Save changes");
  });

  it("prioritises aria-label over text content", () => {
    const doc = makeDoc(`<button aria-label="Close">X</button>`);
    expect(getAccessibleName(doc.querySelector("button")!)).toBe("Close");
  });

  it("returns empty string when no name source found", () => {
    const doc = makeDoc(`<input>`);
    expect(getAccessibleName(doc.querySelector("input")!)).toBe("");
  });

  it("resolves multiple aria-labelledby ids", () => {
    const doc = makeDoc(`<span id="a">First</span><span id="b">Second</span><div aria-labelledby="a b">content</div>`);
    expect(getAccessibleName(doc.querySelector("div")!)).toBe("First Second");
  });
});

// ---------------------------------------------------------------------------
// getAccessibleTextContent
// ---------------------------------------------------------------------------

describe("getAccessibleTextContent", () => {
  it("returns plain text content", () => {
    const doc = makeDoc(`<button>Save</button>`);
    expect(getAccessibleTextContent(doc.querySelector("button")!).trim()).toBe("Save");
  });

  it("excludes aria-hidden subtrees", () => {
    const doc = makeDoc(`<span>Visible<span aria-hidden="true"> hidden</span></span>`);
    expect(getAccessibleTextContent(doc.querySelector("span")!).trim()).toBe("Visible");
  });

  it("excludes elements with hidden attribute", () => {
    const doc = makeDoc(`<button>Save <span hidden>draft</span></button>`);
    expect(getAccessibleTextContent(doc.querySelector("button")!).trim()).toBe("Save");
  });

  it("uses img alt attribute for inline images", () => {
    const doc = makeDoc(`<button><img src="x.png" alt="star"> Favourite</button>`);
    expect(getAccessibleTextContent(doc.querySelector("button")!).trim()).toBe("star Favourite");
  });

  it("uses svg <title> for inline SVGs", () => {
    const doc = makeDoc(`<button><svg><title>Icon</title></svg> Close</button>`);
    expect(getAccessibleTextContent(doc.querySelector("button")!).trim()).toBe("Icon Close");
  });

  it("uses svg aria-label when present", () => {
    const doc = makeDoc(`<button><svg aria-label="Star icon"></svg></button>`);
    expect(getAccessibleTextContent(doc.querySelector("button")!).trim()).toBe("Star icon");
  });

  it("recurses into nested elements", () => {
    const doc = makeDoc(`<span><em>Hello</em> <strong>world</strong></span>`);
    expect(getAccessibleTextContent(doc.querySelector("span")!).trim()).toBe("Hello world");
  });
});

// ---------------------------------------------------------------------------
// isAriaHidden
// ---------------------------------------------------------------------------

describe("isAriaHidden", () => {
  it("returns true for aria-hidden='true'", () => {
    const doc = makeDoc(`<div aria-hidden="true">Hidden</div>`);
    expect(isAriaHidden(doc.querySelector("div")!)).toBe(true);
  });

  it("returns false for aria-hidden='false'", () => {
    const doc = makeDoc(`<div aria-hidden="false">Visible</div>`);
    expect(isAriaHidden(doc.querySelector("div")!)).toBe(false);
  });

  it("returns true for element with hidden attribute", () => {
    const doc = makeDoc(`<div hidden>Hidden</div>`);
    expect(isAriaHidden(doc.querySelector("div")!)).toBe(true);
  });

  it("returns true for element with inline display:none", () => {
    const doc = makeDoc(`<div style="display:none">Hidden</div>`);
    expect(isAriaHidden(doc.querySelector("div")!)).toBe(true);
  });

  it("inherits from aria-hidden ancestor", () => {
    const doc = makeDoc(`<div aria-hidden="true"><span>Child</span></div>`);
    expect(isAriaHidden(doc.querySelector("span")!)).toBe(true);
  });

  it("returns false for visible element", () => {
    const doc = makeDoc(`<div>Visible</div>`);
    expect(isAriaHidden(doc.querySelector("div")!)).toBe(false);
  });

  it("caches results", () => {
    const doc = makeDoc(`<div aria-hidden="true">Hidden</div>`);
    const el = doc.querySelector("div")!;
    expect(isAriaHidden(el)).toBe(true);
    // Remove attribute — cached result should still be true
    el.removeAttribute("aria-hidden");
    expect(isAriaHidden(el)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isComputedHidden
// ---------------------------------------------------------------------------

describe("isComputedHidden", () => {
  it("returns true for element with aria-hidden='true'", () => {
    const doc = makeDoc(`<div aria-hidden="true">Hidden</div>`);
    expect(isComputedHidden(doc.querySelector("div")!)).toBe(true);
  });

  it("returns true for element with hidden attribute", () => {
    const doc = makeDoc(`<div hidden>Hidden</div>`);
    expect(isComputedHidden(doc.querySelector("div")!)).toBe(true);
  });

  it("returns true for child of aria-hidden parent", () => {
    const doc = makeDoc(`<div aria-hidden="true"><span>Child</span></div>`);
    expect(isComputedHidden(doc.querySelector("span")!)).toBe(true);
  });

  it("returns false for visible element", () => {
    const doc = makeDoc(`<div>Visible</div>`);
    expect(isComputedHidden(doc.querySelector("div")!)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isValidRole
// ---------------------------------------------------------------------------

describe("isValidRole", () => {
  it("returns true for valid ARIA roles", () => {
    for (const role of ["button", "link", "navigation", "main", "dialog", "alert"]) {
      expect(isValidRole(role), `role "${role}" should be valid`).toBe(true);
    }
  });

  it("returns false for invalid roles", () => {
    expect(isValidRole("foobar")).toBe(false);
    expect(isValidRole("clickable")).toBe(false);
  });

  it("strips Unicode curly quotes before checking", () => {
    expect(isValidRole("\u201Cbutton\u201D")).toBe(true);
    expect(isValidRole("\u2018link\u2019")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidRole("BUTTON")).toBe(true);
    expect(isValidRole("Navigation")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidAriaAttribute
// ---------------------------------------------------------------------------

describe("isValidAriaAttribute", () => {
  it("returns true for global ARIA attributes", () => {
    expect(isValidAriaAttribute("aria-label")).toBe(true);
    expect(isValidAriaAttribute("aria-hidden")).toBe(true);
    expect(isValidAriaAttribute("aria-labelledby")).toBe(true);
  });

  it("returns true for any aria-* attribute", () => {
    expect(isValidAriaAttribute("aria-custom")).toBe(true);
    expect(isValidAriaAttribute("aria-foo-bar")).toBe(true);
  });

  it("returns false for non-aria attributes", () => {
    expect(isValidAriaAttribute("role")).toBe(false);
    expect(isValidAriaAttribute("data-aria-label")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getVisibleText
// ---------------------------------------------------------------------------

describe("getVisibleText", () => {
  it("returns text content", () => {
    const doc = makeDoc(`<p>Hello world</p>`);
    expect(getVisibleText(doc.querySelector("p")!).trim()).toBe("Hello world");
  });

  it("excludes aria-hidden subtrees", () => {
    const doc = makeDoc(`<p>Hello<span aria-hidden="true"> icon</span></p>`);
    expect(getVisibleText(doc.querySelector("p")!).trim()).toBe("Hello");
  });

  it("excludes elements with inline display:none", () => {
    const doc = makeDoc(`<p>Text<span style="display:none"> hidden</span></p>`);
    expect(getVisibleText(doc.querySelector("p")!).trim()).toBe("Text");
  });

  it("excludes <script> and <style> content", () => {
    const doc = makeDoc(`<div>Text<script>alert(1)</script><style>.x{}</style></div>`);
    expect(getVisibleText(doc.querySelector("div")!).trim()).toBe("Text");
  });

  it("excludes role='img' elements", () => {
    const doc = makeDoc(`<p>Text <span role="img">🌟</span></p>`);
    expect(getVisibleText(doc.querySelector("p")!).trim()).toBe("Text");
  });
});

// ---------------------------------------------------------------------------
// isVisibilityHidden
// ---------------------------------------------------------------------------

describe("isVisibilityHidden", () => {
  it("returns true for inline visibility:hidden", () => {
    const doc = makeDoc(`<span style="visibility:hidden">Hidden</span>`);
    expect(isVisibilityHidden(doc.querySelector("span")!)).toBe(true);
  });

  it("inherits from parent with visibility:hidden", () => {
    const doc = makeDoc(`<div style="visibility:hidden"><span>Child</span></div>`);
    expect(isVisibilityHidden(doc.querySelector("span")!)).toBe(true);
  });

  it("returns false for visible elements", () => {
    const doc = makeDoc(`<span>Visible</span>`);
    expect(isVisibilityHidden(doc.querySelector("span")!)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getExplicitAccessibleName
// ---------------------------------------------------------------------------

describe("getExplicitAccessibleName", () => {
  it("uses aria-labelledby", () => {
    const doc = makeDoc(`<span id="lbl">Label</span><div aria-labelledby="lbl">content</div>`);
    expect(getExplicitAccessibleName(doc.querySelector("div")!)).toBe("Label");
  });

  it("uses aria-label", () => {
    const doc = makeDoc(`<div aria-label="My region">content</div>`);
    expect(getExplicitAccessibleName(doc.querySelector("div")!)).toBe("My region");
  });

  it("uses title attribute", () => {
    const doc = makeDoc(`<div title="Tooltip">content</div>`);
    expect(getExplicitAccessibleName(doc.querySelector("div")!)).toBe("Tooltip");
  });

  it("does NOT fall through to text content", () => {
    const doc = makeDoc(`<button>Click me</button>`);
    expect(getExplicitAccessibleName(doc.querySelector("button")!)).toBe("");
  });

  it("returns empty string when no explicit name", () => {
    const doc = makeDoc(`<div>content</div>`);
    expect(getExplicitAccessibleName(doc.querySelector("div")!)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// isInShadowDOM
// ---------------------------------------------------------------------------

describe("isInShadowDOM", () => {
  it("returns false for elements in the main document", () => {
    const doc = makeDoc(`<div>Content</div>`);
    expect(isInShadowDOM(doc.querySelector("div")!)).toBe(false);
  });

  it("returns true for elements inside a shadow root", () => {
    const doc = makeDoc(`<div id="host"></div>`);
    const host = doc.querySelector("#host")!;
    const shadow = host.attachShadow({ mode: "open" });
    const inner = doc.createElement("span");
    shadow.appendChild(inner);
    expect(isInShadowDOM(inner)).toBe(true);
  });
});
