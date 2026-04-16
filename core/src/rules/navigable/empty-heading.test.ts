import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { emptyHeading } from "./empty-heading";


describe("navigable/empty-heading", () => {
  it("reports empty h1", () => {
    const doc = makeDoc("<html><body><h1></h1></body></html>");
    const violations = emptyHeading.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/empty-heading");
  });

  it("reports empty h2", () => {
    const doc = makeDoc("<html><body><h2></h2></body></html>");
    expect(emptyHeading.run(doc)).toHaveLength(1);
  });

  it("reports whitespace-only heading", () => {
    const doc = makeDoc("<html><body><h1>   </h1></body></html>");
    expect(emptyHeading.run(doc)).toHaveLength(1);
  });

  it("reports empty role=heading", () => {
    const doc = makeDoc('<html><body><div role="heading" aria-level="2"></div></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(1);
  });

  it("passes heading with text", () => {
    const doc = makeDoc("<html><body><h1>Page Title</h1></body></html>");
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with aria-label", () => {
    const doc = makeDoc('<html><body><h1 aria-label="Page Title"></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with aria-labelledby", () => {
    const doc = makeDoc('<html><body><span id="title">Page Title</span><h1 aria-labelledby="title"></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden headings", () => {
    const doc = makeDoc('<html><body><h1 aria-hidden="true"></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("reports multiple empty headings", () => {
    const doc = makeDoc("<html><body><h1></h1><h2></h2><h3></h3></body></html>");
    expect(emptyHeading.run(doc)).toHaveLength(3);
  });

  it("passes heading with nested text", () => {
    const doc = makeDoc("<html><body><h1><span>Title</span></h1></body></html>");
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with img alt text (accName from content)", () => {
    const doc = makeDoc('<html><body><h1><img src="logo.png" alt="Company Name"></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with img inside a link", () => {
    const doc = makeDoc('<html><body><h1><a href="/"><img src="logo.png" alt="Home"></a></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("reports heading with img with empty alt", () => {
    const doc = makeDoc('<html><body><h1><img src="logo.png" alt=""></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(1);
  });

  it("passes heading with child element having aria-label", () => {
    const doc = makeDoc('<html><body><h1><span role="img" aria-label="Logo"></span></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with svg with aria-label", () => {
    const doc = makeDoc('<html><body><h1><svg aria-label="Logo"><path d="M0 0"/></svg></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with svg title element", () => {
    const doc = makeDoc('<html><body><h1><svg><title>Logo</title><path d="M0 0"/></svg></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });

  it("passes heading with img aria-label (no alt)", () => {
    const doc = makeDoc('<html><body><h1><img src="logo.png" aria-label="Company"></h1></body></html>');
    expect(emptyHeading.run(doc)).toHaveLength(0);
  });
});
