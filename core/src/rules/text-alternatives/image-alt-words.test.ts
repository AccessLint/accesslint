import { describe, it, expect } from "vitest";
import { imageAltWords } from "./image-alt-words";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/image-alt-words", () => {
  // --- Should flag (prefix patterns) ---
  it("reports alt starting with 'image of'", () => {
    const doc = makeDoc('<img src="dog.jpg" alt="image of a dog">');
    const violations = imageAltWords.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/image-alt-words");
  });

  it("reports alt starting with 'photo of'", () => {
    const doc = makeDoc('<img src="team.jpg" alt="photo of team">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt starting with 'picture of'", () => {
    const doc = makeDoc('<img src="sunset.jpg" alt="picture of sunset">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt starting with 'graphic of'", () => {
    const doc = makeDoc('<img src="chart.png" alt="graphic of sales data">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt that is just 'icon'", () => {
    const doc = makeDoc('<img src="x.png" alt="icon">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt that is just 'image'", () => {
    const doc = makeDoc('<img src="x.png" alt="image">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt with separator 'photo: sunset'", () => {
    const doc = makeDoc('<img src="x.jpg" alt="photo: sunset">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports alt with dash 'icon - search'", () => {
    const doc = makeDoc('<img src="x.png" alt="icon - search">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  it("reports case-insensitive 'Image Of a dog'", () => {
    const doc = makeDoc('<img src="x.jpg" alt="Image Of a dog">');
    expect(imageAltWords.run(doc)).toHaveLength(1);
  });

  // --- Should NOT flag ---
  it("passes alt text without redundant words", () => {
    const doc = makeDoc('<img src="dog.jpg" alt="Golden retriever playing fetch">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("passes empty alt", () => {
    const doc = makeDoc('<img src="spacer.gif" alt="">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("does not flag partial word matches like 'Imagination'", () => {
    const doc = makeDoc('<img src="x.jpg" alt="Imagination is key">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'icon' in middle: 'Close icon for closing window'", () => {
    const doc = makeDoc('<img src="x.png" alt="Close icon for closing window">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'photo' as brand name: 'Walmart Photo logo'", () => {
    const doc = makeDoc('<img src="x.png" alt="Walmart Photo logo">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'icon' at end: 'magnifying glass icon'", () => {
    const doc = makeDoc('<img src="x.png" alt="magnifying glass icon">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'photo' in natural sentence: 'A family taking a photo'", () => {
    const doc = makeDoc('<img src="x.jpg" alt="A family taking a photo">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'image' not at start: 'Brand image gallery'", () => {
    const doc = makeDoc('<img src="x.jpg" alt="Brand image gallery">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });

  it("skips 'icon' followed by a regular word: 'Icon set for navigation'", () => {
    const doc = makeDoc('<img src="x.png" alt="Icon set for navigation">');
    expect(imageAltWords.run(doc)).toHaveLength(0);
  });
});
