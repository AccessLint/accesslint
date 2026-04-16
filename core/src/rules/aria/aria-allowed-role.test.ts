import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaAllowedRole } from "./aria-allowed-role";


describe("aria/aria-allowed-role", () => {
  it("passes valid role on div", () => {
    const doc = makeDoc('<div role="button">Click me</div>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes valid role on button", () => {
    const doc = makeDoc('<button role="switch">Toggle</button>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("reports invalid role on button", () => {
    const doc = makeDoc('<button role="heading">Not a heading</button>');
    const violations = ariaAllowedRole.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("heading");
  });

  it("passes checkbox role on button", () => {
    const doc = makeDoc('<button role="checkbox" aria-checked="false">Option</button>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("reports role on elements that should not have roles", () => {
    const doc = makeDoc('<meta role="button">');
    const violations = ariaAllowedRole.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes any role on span", () => {
    const doc = makeDoc('<span role="button">Click</span>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("allows presentation/none on img with empty alt", () => {
    const doc = makeDoc('<img alt="" role="presentation" src="spacer.gif">');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("reports non-presentation role on img with empty alt", () => {
    const doc = makeDoc('<img alt="" role="button" src="icon.png">');
    const violations = ariaAllowedRole.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes menuitem role on li", () => {
    const doc = makeDoc('<ul><li role="menuitem">Item</li></ul>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<button role="heading" aria-hidden="true">Hidden</button>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  // Redundant-but-valid roles (implicit role == explicit role)
  it("passes redundant role=button on button", () => {
    const doc = makeDoc('<button role="button">Click</button>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes redundant role=link on a[href]", () => {
    const doc = makeDoc('<a href="/" role="link">Home</a>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes redundant role=navigation on nav", () => {
    const doc = makeDoc('<nav role="navigation"><a href="/">Home</a></nav>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes redundant role=main on main", () => {
    const doc = makeDoc('<main role="main">Content</main>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes redundant role=complementary on aside", () => {
    const doc = makeDoc('<aside role="complementary">Sidebar</aside>');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes combobox role on input[type=search]", () => {
    const doc = makeDoc('<input type="search" role="combobox" aria-expanded="false" aria-controls="list1">');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("passes searchbox role on input[type=search]", () => {
    const doc = makeDoc('<input type="search" role="searchbox">');
    expect(ariaAllowedRole.run(doc)).toHaveLength(0);
  });

  it("reports disallowed role on input[type=search]", () => {
    const doc = makeDoc('<input type="search" role="button">');
    const violations = ariaAllowedRole.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("button");
  });
});
