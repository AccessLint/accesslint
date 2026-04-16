import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { pAsHeading } from "./p-as-heading";

describe("navigable/p-as-heading", () => {
  it("passes normal paragraph", () => {
    const doc = makeDoc("<html><body><p>Regular paragraph text.</p></body></html>");
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });

  it("reports paragraph styled as heading with bold and large font", () => {
    const doc = makeDoc(`<html><body>
      <p style="font-weight: bold; font-size: 24px">Section Title</p>
      <p>Content below the heading-like paragraph.</p>
    </body></html>`);
    const violations = pAsHeading.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("navigable/p-as-heading");
    expect(violations[0].message).toContain("heading");
  });

  it("reports paragraph with bold style and heading class", () => {
    const doc = makeDoc(`<html><body>
      <p class="heading" style="font-weight: bold">Section Title</p>
      <p>Content below.</p>
    </body></html>`);
    const violations = pAsHeading.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes paragraph with bold but no large font or heading class", () => {
    const doc = makeDoc(`<html><body>
      <p style="font-weight: bold">Bold text</p>
      <p>Content below.</p>
    </body></html>`);
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });

  it("passes long paragraph even with heading-like styles", () => {
    const doc = makeDoc(`<html><body>
      <p style="font-weight: bold; font-size: 24px">This is a very long paragraph that exceeds fifty characters and therefore should not be flagged.</p>
      <p>Content below.</p>
    </body></html>`);
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });

  it("passes paragraph ending with punctuation", () => {
    const doc = makeDoc(`<html><body>
      <p style="font-weight: bold; font-size: 24px">Important note.</p>
      <p>Content below.</p>
    </body></html>`);
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });

  it("passes paragraph with no following content", () => {
    const doc = makeDoc(`<html><body>
      <p style="font-weight: bold; font-size: 24px">Section Title</p>
    </body></html>`);
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden paragraphs", () => {
    const doc = makeDoc(`<html><body>
      <p aria-hidden="true" style="font-weight: bold; font-size: 24px">Hidden Title</p>
      <p>Content below.</p>
    </body></html>`);
    expect(pAsHeading.run(doc)).toHaveLength(0);
  });
});
