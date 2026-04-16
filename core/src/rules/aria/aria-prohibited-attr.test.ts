import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { ariaProhibitedAttr } from "./aria-prohibited-attr";


describe("aria/aria-prohibited-attr", () => {
  it("reports aria-label on role=none", () => {
    const doc = makeDoc('<img role="none" aria-label="Decorative" src="bg.png">');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("aria-label");
  });

  it("reports aria-labelledby on role=presentation", () => {
    const doc = makeDoc('<img role="presentation" aria-labelledby="desc" src="bg.png">');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports aria-label on role=generic", () => {
    const doc = makeDoc('<div role="generic" aria-label="Container"></div>');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("allows aria-label on span without role (common real-world pattern)", () => {
    const doc = makeDoc('<span aria-label="Text">Some text</span>');
    // span and i are excluded from no-name-elements to avoid false positives
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });

  it("reports aria-label on code element", () => {
    const doc = makeDoc('<code aria-label="Code snippet">const x = 1</code>');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports aria-label on strong element", () => {
    const doc = makeDoc('<strong aria-label="Important">Warning</strong>');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes aria-label on div without role (div can take role)", () => {
    const doc = makeDoc('<div aria-label="Container">Content</div>');
    // div without role has implicit generic role, but checking varies
    // This test ensures we don't over-report
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });

  it("passes aria-label on button", () => {
    const doc = makeDoc('<button aria-label="Close">X</button>');
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });

  it("passes aria-label on link", () => {
    const doc = makeDoc('<a href="/" aria-label="Home">Home</a>');
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });

  it("reports aria-label on em element", () => {
    const doc = makeDoc('<em aria-label="Emphasis">text</em>');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports aria-label on mark element", () => {
    const doc = makeDoc('<mark aria-label="Highlighted">text</mark>');
    const violations = ariaProhibitedAttr.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<span aria-label="Hidden" aria-hidden="true">Text</span>');
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });

  it("allows aria-describedby on paragraph (global attr)", () => {
    const doc = makeDoc('<p aria-describedby="note">Text</p>');
    expect(ariaProhibitedAttr.run(doc)).toHaveLength(0);
  });
});
