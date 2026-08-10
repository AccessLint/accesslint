import { describe, it, expect } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { listChildren } from "./list-children";

const RULE_ID = "adaptable/list-children";

/** A mega-menu panel: wrapper <div>s nested a few levels around inner <ul>s. */
function megaMenu(panelInner: string): string {
  return `<html><body><header><nav class="site-nav">
    <ul class="nav__list">
      <li class="nav__item">
        <button aria-expanded="false">Products</button>
        <div class="mega-menu"><div class="mega-menu__inner"><div class="mega-menu__col">
          ${panelInner}
        </div></div></div>
      </li>
    </ul>
  </nav></header></body></html>`;
}

describe(RULE_ID, () => {
  it("passes valid ul", () => {
    expectNoViolations(listChildren, "<html><body><ul><li>A</li><li>B</li></ul></body></html>");
  });

  it("reports non-li child in ul", () => {
    expectViolations(listChildren, "<html><body><ul><div>Bad</div></ul></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports stray <span> children directly inside a ul", () => {
    const violations = expectViolations(
      listChildren,
      "<html><body><ul><li>A</li><span>Stray</span></ul></body></html>",
      { count: 1, ruleId: RULE_ID, messageMatches: /<span>/ },
    );
    expect(violations[0].element?.tagName).toBe("UL");
  });

  it("anchors the violation to the list, not to the offending child", () => {
    const violations = expectViolations(
      listChildren,
      "<html><body><ul class='menu'><div class='promo'>Bad</div></ul></body></html>",
      { count: 1, ruleId: RULE_ID },
    );
    expect(violations[0].element?.tagName).toBe("UL");
    expect(violations[0].html).toContain("<ul");
    expect(violations[0].message).toContain("<div>");
  });

  it("passes a mega-menu whose wrapper divs contain only valid lists", () => {
    expectNoViolations(
      listChildren,
      megaMenu(
        `<ul class="menu-list"><li><a href="/a">A</a></li><li><a href="/b">B</a></li></ul>
         <ul class="menu-list"><li><a href="/c">C</a></li></ul>`,
      ),
    );
  });

  it("anchors a mega-menu violation to the offending ul, not the wrapper div", () => {
    const violations = expectViolations(
      listChildren,
      megaMenu(
        `<ul class="menu-list"><div class="promo">Promo</div><li><a href="/a">A</a></li></ul>`,
      ),
      { count: 1, ruleId: RULE_ID },
    );
    expect(violations[0].element?.tagName).toBe("UL");
    expect(violations[0].element?.getAttribute("class")).toBe("menu-list");
    expect(violations[0].selector).not.toMatch(/> div$/);
  });

  it("reports bare text node in ul", () => {
    expectViolations(listChildren, "<html><body><ul>Bare text<li>Item</li></ul></body></html>", {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /text.*<li>|<li>.*text/,
    });
  });

  it("passes style element inside ul (CSS-in-JS)", () => {
    expectNoViolations(
      listChildren,
      "<html><body><ul><style>.x{color:red}</style><li>A</li></ul></body></html>",
    );
  });

  it("passes ul with only whitespace text nodes", () => {
    expectNoViolations(listChildren, "<html><body><ul> <li>A</li> <li>B</li> </ul></body></html>");
  });
});
