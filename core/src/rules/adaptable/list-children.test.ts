import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { listChildren } from "./list-children";


describe("adaptable/list-children", () => {
  it("passes valid ul", () => {
    const doc = makeDoc("<html><body><ul><li>A</li><li>B</li></ul></body></html>");
    expect(listChildren.run(doc)).toHaveLength(0);
  });

  it("reports non-li child in ul", () => {
    const doc = makeDoc("<html><body><ul><div>Bad</div></ul></body></html>");
    expect(listChildren.run(doc)).toHaveLength(1);
  });

  it("reports bare text node in ul", () => {
    const doc = makeDoc("<html><body><ul>Bare text<li>Item</li></ul></body></html>");
    const violations = listChildren.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("text");
    expect(violations[0].message).toContain("<li>");
  });

  it("passes style element inside ul (CSS-in-JS)", () => {
    const doc = makeDoc('<html><body><ul><style>.x{color:red}</style><li>A</li></ul></body></html>');
    expect(listChildren.run(doc)).toHaveLength(0);
  });

  it("passes ul with only whitespace text nodes", () => {
    const doc = makeDoc("<html><body><ul> <li>A</li> <li>B</li> </ul></body></html>");
    expect(listChildren.run(doc)).toHaveLength(0);
  });
});
