import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { metaViewport } from "./meta-viewport";

const RULE_ID = "distinguishable/meta-viewport";

describe(RULE_ID, () => {
  it("passes without viewport meta", () => {
    expectNoViolations(metaViewport, "<html><head></head><body></body></html>");
  });

  it("passes viewport without zoom restrictions", () => {
    expectNoViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head></html>',
    );
  });

  it("reports user-scalable=no", () => {
    expectViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="user-scalable=no"></head></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /user-scalable/ },
    );
  });

  it("reports user-scalable=0", () => {
    expectViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="user-scalable=0"></head></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports user-scalable=0.5 (fractional value disables zoom)", () => {
    expectViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="width=device-width, user-scalable=0.5"></head></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /user-scalable=0\.5/ },
    );
  });

  it("passes user-scalable=1 (zoom enabled)", () => {
    expectNoViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="width=device-width, user-scalable=1"></head></html>',
    );
  });

  it("passes user-scalable=yes", () => {
    expectNoViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="width=device-width, user-scalable=yes"></head></html>',
    );
  });

  it("reports maximum-scale=1", () => {
    expectViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="maximum-scale=1"></head></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /maximum-scale/ },
    );
  });

  it("reports maximum-scale=1.5", () => {
    expectViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="maximum-scale=1.5"></head></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes maximum-scale=2", () => {
    expectNoViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="maximum-scale=2"></head></html>',
    );
  });

  it("passes maximum-scale=5", () => {
    expectNoViolations(
      metaViewport,
      '<html><head><meta name="viewport" content="maximum-scale=5"></head></html>',
    );
  });
});
