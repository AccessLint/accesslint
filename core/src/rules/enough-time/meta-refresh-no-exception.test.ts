import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { metaRefreshNoException } from "./meta-refresh-no-exception";

const RULE_ID = "enough-time/meta-refresh-no-exception";

describe(RULE_ID, () => {
  it("passes without refresh meta", () => {
    expectNoViolations(metaRefreshNoException, "<html><head></head><body></body></html>");
  });

  it("allows immediate redirect (delay 0)", () => {
    expectNoViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>',
    );
  });

  it("reports timed redirect", () => {
    expectViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="5;url=/new-page"></head></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /5-second/ },
    );
  });

  it("reports same-page refresh with positive delay", () => {
    expectViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="30"></head></html>',
      { count: 1, messageMatches: /30-second/ },
    );
  });

  it("reports very long redirect (no 72000 exception)", () => {
    expectViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="100000;url=/new-page"></head></html>',
      { count: 1, messageMatches: /100000-second/ },
    );
  });

  it("passes delay 0 with no URL", () => {
    expectNoViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="0"></head></html>',
    );
  });

  it("ignores malformed content attribute", () => {
    expectNoViolations(
      metaRefreshNoException,
      '<html><head><meta http-equiv="refresh" content="abc"></head></html>',
    );
  });
});
