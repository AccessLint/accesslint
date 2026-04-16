import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { linkName } from "./link-name";


describe("navigable/link-name", () => {
  it("reports empty links", () => {
    const doc = makeDoc('<html><body><a href="/page"></a></body></html>');
    expect(linkName.run(doc)).toHaveLength(1);
  });

  it("passes links with text", () => {
    const doc = makeDoc('<html><body><a href="/page">About</a></body></html>');
    expect(linkName.run(doc)).toHaveLength(0);
  });

  it("passes links with aria-label", () => {
    const doc = makeDoc('<html><body><a href="/page" aria-label="About us"></a></body></html>');
    expect(linkName.run(doc)).toHaveLength(0);
  });

  it("passes links with img alt inside", () => {
    const doc = makeDoc('<html><body><a href="/page"><img src="x.png" alt="Logo"></a></body></html>');
    expect(linkName.run(doc)).toHaveLength(0);
  });

  it("reports link whose only text is inside a display:none child", () => {
    const doc = makeDoc(
      '<html><body><a href="/page"><span style="display: none;">Hidden</span></a></body></html>'
    );
    expect(linkName.run(doc)).toHaveLength(1);
  });

  it("reports link whose only text is inside a visibility:hidden child", () => {
    const doc = makeDoc(
      '<html><body><a href="/page"><span style="visibility: hidden;">Hidden</span></a></body></html>'
    );
    expect(linkName.run(doc)).toHaveLength(1);
  });

  it("passes link with mix of hidden and visible text", () => {
    const doc = makeDoc(
      '<html><body><a href="/page"><span style="display: none;">Icon</span> About</a></body></html>'
    );
    expect(linkName.run(doc)).toHaveLength(0);
  });
});
