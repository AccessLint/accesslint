import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { metaRefresh } from "./meta-refresh";

const RULE_ID = "enough-time/meta-refresh";

describe(RULE_ID, () => {
  it("passes without refresh meta", () => {
    expectNoViolations(metaRefresh, "<html><head></head><body></body></html>");
  });

  it("reports timed redirect", () => {
    expectViolations(
      metaRefresh,
      '<html><head><meta http-equiv="refresh" content="5;url=/new-page"></head></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /redirects.*5 seconds/ },
    );
  });

  it("allows immediate redirect (delay 0)", () => {
    expectNoViolations(
      metaRefresh,
      '<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>',
    );
  });

  it("reports auto-refresh", () => {
    expectViolations(
      metaRefresh,
      '<html><head><meta http-equiv="refresh" content="30"></head></html>',
      { count: 1, messageMatches: /30 seconds/ },
    );
  });

  it("passes very long refresh interval", () => {
    expectNoViolations(
      metaRefresh,
      '<html><head><meta http-equiv="refresh" content="100000"></head></html>',
    );
  });
});
