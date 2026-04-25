/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { buildRelativeLocation } from "./signals";

function mount(html: string): Element {
  document.body.innerHTML = html.trim();
  return document.body.firstElementChild as Element;
}

function find(root: Element, selector: string): Element {
  const el = root.matches(selector) ? root : root.querySelector(selector);
  if (!el) throw new Error(`selector not found: ${selector}`);
  return el;
}

describe("buildRelativeLocation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("anchors to the nearest landmark ancestor", () => {
    mount(`<main><section><img alt=""></section></main>`);
    const img = find(document.body, "img");
    const out = buildRelativeLocation(img);
    expect(out).toContain("main");
  });

  it("includes an intermediate id crumb between element and landmark", () => {
    mount(`<main><form id="login"><fieldset><input type="text"></fieldset></form></main>`);
    const input = find(document.body, "input");
    expect(buildRelativeLocation(input)).toContain("form#login");
  });

  it("includes an intermediate role crumb", () => {
    mount(`<main><section role="region"><div><img></div></section></main>`);
    const img = find(document.body, "img");
    expect(buildRelativeLocation(img)).toContain("section[role=region]");
  });

  it("picks the intermediate crumb closest to the element", () => {
    mount(
      `<main><div id="outer"><div id="inner"><div><img></div></div></div></main>`,
    );
    const img = find(document.body, "img");
    const out = buildRelativeLocation(img);
    expect(out).toContain("div#inner");
    expect(out).not.toContain("div#outer");
  });

  it("returns null when no landmark exists within the walk limit", () => {
    // 8 nested divs + body, no landmark. Walk limit is 6.
    mount(
      `<div><div><div><div><div><div><div><div><img></div></div></div></div></div></div></div></div>`,
    );
    const img = find(document.body, "img");
    expect(buildRelativeLocation(img)).toBeNull();
  });

  it("returns null when the element is directly under body with no landmark", () => {
    mount(`<div><img></div>`);
    const img = find(document.body, "img");
    expect(buildRelativeLocation(img)).toBeNull();
  });

  it("is invariant under wrapper insertion", () => {
    mount(`<main><form id="login"><img></form></main>`);
    const a = buildRelativeLocation(find(document.body, "img"));
    document.body.innerHTML = "";
    mount(`<main><form id="login"><div><span><img></span></div></form></main>`);
    const b = buildRelativeLocation(find(document.body, "img"));
    expect(a).toBe(b);
  });
});
