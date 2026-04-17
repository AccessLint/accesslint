import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { frameTitleUnique } from "./frame-title-unique";

const RULE_ID = "labels-and-names/frame-title-unique";

describe(RULE_ID, () => {
  it("passes when frame titles are unique", () => {
    expectNoViolations(
      frameTitleUnique,
      `
      <html><body>
        <iframe src="a.html" title="Video player"></iframe>
        <iframe src="b.html" title="Chat widget"></iframe>
      </body></html>
    `,
    );
  });

  it("reports duplicate frame titles", () => {
    expectViolations(
      frameTitleUnique,
      `
      <html><body>
        <iframe src="a.html" title="Content"></iframe>
        <iframe src="b.html" title="Content"></iframe>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports multiple duplicates", () => {
    expectViolations(
      frameTitleUnique,
      `
      <html><body>
        <iframe src="a.html" title="Frame"></iframe>
        <iframe src="b.html" title="Frame"></iframe>
        <iframe src="c.html" title="Frame"></iframe>
      </body></html>
    `,
      { count: 2, ruleId: RULE_ID },
    );
  });

  it("is case-insensitive", () => {
    expectViolations(
      frameTitleUnique,
      `
      <html><body>
        <iframe src="a.html" title="Video"></iframe>
        <iframe src="b.html" title="VIDEO"></iframe>
      </body></html>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes with single frame", () => {
    expectNoViolations(
      frameTitleUnique,
      '<html><body><iframe src="page.html" title="Content"></iframe></body></html>',
    );
  });
});
