import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { pAsHeading } from "./p-as-heading";

const RULE_ID = "navigable/p-as-heading";

describe(RULE_ID, () => {
  it("passes normal paragraph", () => {
    expectNoViolations(pAsHeading, "<html><body><p>Regular paragraph text.</p></body></html>");
  });

  it("reports paragraph styled as heading with bold and large font", () => {
    expectViolations(
      pAsHeading,
      `<html><body>
      <p style="font-weight: bold; font-size: 24px">Section Title</p>
      <p>Content below the heading-like paragraph.</p>
    </body></html>`,
      { count: 1, ruleId: RULE_ID, messageMatches: /heading/ },
    );
  });

  it("reports paragraph with bold style and heading class", () => {
    expectViolations(
      pAsHeading,
      `<html><body>
      <p class="heading" style="font-weight: bold">Section Title</p>
      <p>Content below.</p>
    </body></html>`,
      { count: 1 },
    );
  });

  it("passes paragraph with bold but no large font or heading class", () => {
    expectNoViolations(
      pAsHeading,
      `<html><body>
      <p style="font-weight: bold">Bold text</p>
      <p>Content below.</p>
    </body></html>`,
    );
  });

  it("passes long paragraph even with heading-like styles", () => {
    expectNoViolations(
      pAsHeading,
      `<html><body>
      <p style="font-weight: bold; font-size: 24px">This is a very long paragraph that exceeds fifty characters and therefore should not be flagged.</p>
      <p>Content below.</p>
    </body></html>`,
    );
  });

  it("passes paragraph ending with punctuation", () => {
    expectNoViolations(
      pAsHeading,
      `<html><body>
      <p style="font-weight: bold; font-size: 24px">Important note.</p>
      <p>Content below.</p>
    </body></html>`,
    );
  });

  it("passes paragraph with no following content", () => {
    expectNoViolations(
      pAsHeading,
      `<html><body>
      <p style="font-weight: bold; font-size: 24px">Section Title</p>
    </body></html>`,
    );
  });

  it("skips aria-hidden paragraphs", () => {
    expectNoViolations(
      pAsHeading,
      `<html><body>
      <p aria-hidden="true" style="font-weight: bold; font-size: 24px">Hidden Title</p>
      <p>Content below.</p>
    </body></html>`,
    );
  });
});
