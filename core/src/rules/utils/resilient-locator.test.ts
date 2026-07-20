import { describe, it, expect, afterEach } from "vitest";
import { makeDoc } from "../../test-helpers";
import { getResilientLocator } from "./resilient-locator";
import { clearSelectorCache } from "./selector";
import { clearComputedRoleCache, clearAccessibleNameCache } from "./aria";

/** Recompute from scratch every call so stability assertions are genuine. */
function locatorOf(el: Element): string {
  clearSelectorCache();
  clearComputedRoleCache();
  clearAccessibleNameCache();
  return getResilientLocator(el);
}

afterEach(() => {
  clearSelectorCache();
  clearComputedRoleCache();
  clearAccessibleNameCache();
});

describe("getResilientLocator — ladder priority", () => {
  it("prefers data-testid over role", () => {
    const doc = makeDoc(`<button data-testid="save-btn">Save</button>`);
    expect(locatorOf(doc.querySelector("button")!)).toBe(`getByTestId('save-btn')`);
  });

  it("uses role + accessible name for interactive elements", () => {
    const doc = makeDoc(`<main><form><button type="submit">Submit</button></form></main>`);
    expect(locatorOf(doc.querySelector("button")!)).toBe(`getByRole('button', { name: 'Submit' })`);
  });

  it("derives the name from an associated label (id is irrelevant)", () => {
    const doc = makeDoc(`<label for="e">Email</label><input id="e" type="email">`);
    expect(locatorOf(doc.querySelector("input")!)).toBe(`getByRole('textbox', { name: 'Email' })`);
  });

  it("uses role for a named landmark", () => {
    const doc = makeDoc(`<nav aria-label="Primary"><a href="/">Home</a></nav>`);
    expect(locatorOf(doc.querySelector("nav")!)).toBe(
      `getByRole('navigation', { name: 'Primary' })`,
    );
  });

  it("falls back to getByText for a role-less leaf", () => {
    const doc = makeDoc(`<main><div>Hello world</div></main>`);
    expect(locatorOf(doc.querySelector("div")!)).toBe(`getByText('Hello world')`);
  });

  it("falls back to the CSS path when no user-facing handle exists", () => {
    const doc = makeDoc(`<main><div><span>a</span><span>b</span></div></main>`);
    const div = doc.querySelector("main > div")!;
    const loc = locatorOf(div);
    expect(loc).not.toMatch(/^getBy/);
    expect(loc).toContain("div");
  });

  it("escapes quotes in accessible names", () => {
    const doc = makeDoc(`<button>It's "ok"</button>`);
    const loc = locatorOf(doc.querySelector("button")!);
    expect(loc).toContain(`getByRole('button'`);
    expect(loc).toContain(`\\'`); // single quote escaped inside the literal
  });
});

describe("getResilientLocator — stability under benign DOM mutations", () => {
  function setup() {
    const doc = makeDoc(`
      <main>
        <form>
          <label>Email <input type="email"></label>
          <button type="submit">Submit</button>
        </form>
      </main>
    `);
    const btn = doc.querySelector("button")!;
    return { doc, btn };
  }

  const EXPECTED = `getByRole('button', { name: 'Submit' })`;

  it("is invariant when a sibling is inserted before it", () => {
    const { doc, btn } = setup();
    expect(locatorOf(btn)).toBe(EXPECTED);
    const p = doc.createElement("p");
    p.textContent = "intro";
    btn.parentElement!.insertBefore(p, btn);
    expect(locatorOf(btn)).toBe(EXPECTED);
  });

  it("is invariant when wrapped in an extra container", () => {
    const { doc, btn } = setup();
    expect(locatorOf(btn)).toBe(EXPECTED);
    const wrap = doc.createElement("div");
    btn.parentElement!.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    expect(locatorOf(btn)).toBe(EXPECTED);
  });

  it("is invariant when a framework-generated id is added", () => {
    const { btn } = setup();
    expect(locatorOf(btn)).toBe(EXPECTED);
    btn.id = ":r9:";
    expect(locatorOf(btn)).toBe(EXPECTED);
  });

  it("is invariant when class and style churn", () => {
    const { btn } = setup();
    expect(locatorOf(btn)).toBe(EXPECTED);
    btn.className = "btn-primary css-1x2y3z";
    btn.setAttribute("style", "color: red");
    expect(locatorOf(btn)).toBe(EXPECTED);
  });
});
