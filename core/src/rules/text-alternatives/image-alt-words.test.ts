import { describe, it } from "vitest";
import { imageAltWords } from "./image-alt-words";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/image-alt-words";

describe(RULE_ID, () => {
  // --- Should flag (prefix patterns) ---
  it("reports alt starting with 'image of'", () => {
    expectViolations(imageAltWords, '<img src="dog.jpg" alt="image of a dog">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt starting with 'photo of'", () => {
    expectViolations(imageAltWords, '<img src="team.jpg" alt="photo of team">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt starting with 'picture of'", () => {
    expectViolations(imageAltWords, '<img src="sunset.jpg" alt="picture of sunset">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt starting with 'graphic of'", () => {
    expectViolations(imageAltWords, '<img src="chart.png" alt="graphic of sales data">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt that is just 'icon'", () => {
    expectViolations(imageAltWords, '<img src="x.png" alt="icon">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt that is just 'image'", () => {
    expectViolations(imageAltWords, '<img src="x.png" alt="image">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt with separator 'photo: sunset'", () => {
    expectViolations(imageAltWords, '<img src="x.jpg" alt="photo: sunset">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports alt with dash 'icon - search'", () => {
    expectViolations(imageAltWords, '<img src="x.png" alt="icon - search">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports case-insensitive 'Image Of a dog'", () => {
    expectViolations(imageAltWords, '<img src="x.jpg" alt="Image Of a dog">', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  // --- Should NOT flag ---
  it("passes alt text without redundant words", () => {
    expectNoViolations(imageAltWords, '<img src="dog.jpg" alt="Golden retriever playing fetch">');
  });

  it("passes empty alt", () => {
    expectNoViolations(imageAltWords, '<img src="spacer.gif" alt="">');
  });

  it("does not flag partial word matches like 'Imagination'", () => {
    expectNoViolations(imageAltWords, '<img src="x.jpg" alt="Imagination is key">');
  });

  it("skips 'icon' in middle: 'Close icon for closing window'", () => {
    expectNoViolations(imageAltWords, '<img src="x.png" alt="Close icon for closing window">');
  });

  it("skips 'photo' as brand name: 'Walmart Photo logo'", () => {
    expectNoViolations(imageAltWords, '<img src="x.png" alt="Walmart Photo logo">');
  });

  it("skips 'icon' at end: 'magnifying glass icon'", () => {
    expectNoViolations(imageAltWords, '<img src="x.png" alt="magnifying glass icon">');
  });

  it("skips 'photo' in natural sentence: 'A family taking a photo'", () => {
    expectNoViolations(imageAltWords, '<img src="x.jpg" alt="A family taking a photo">');
  });

  it("skips 'image' not at start: 'Brand image gallery'", () => {
    expectNoViolations(imageAltWords, '<img src="x.jpg" alt="Brand image gallery">');
  });

  it("skips 'icon' followed by a regular word: 'Icon set for navigation'", () => {
    expectNoViolations(imageAltWords, '<img src="x.png" alt="Icon set for navigation">');
  });
});
