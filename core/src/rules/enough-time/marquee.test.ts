import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { marquee } from "./marquee";

const RULE_ID = "enough-time/marquee";

describe(RULE_ID, () => {
  it("reports marquee element", () => {
    expectViolations(marquee, "<html><body><marquee>Scrolling text</marquee></body></html>", {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes without marquee element", () => {
    expectNoViolations(marquee, "<html><body><p>Static text</p></body></html>");
  });

  it("skips aria-hidden marquee", () => {
    expectNoViolations(
      marquee,
      '<html><body><marquee aria-hidden="true">Hidden</marquee></body></html>',
    );
  });

  it("reports multiple marquee elements", () => {
    expectViolations(
      marquee,
      "<html><body><marquee>One</marquee><marquee>Two</marquee></body></html>",
      {
        count: 2,
        ruleId: RULE_ID,
      },
    );
  });
});
