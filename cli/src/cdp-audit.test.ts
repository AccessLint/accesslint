import { describe, expect, it } from "vitest";
import { buildAuditExpression } from "./cdp-audit.js";

describe("buildAuditExpression", () => {
  it("preserves test engine and environment metadata across JSON serialization", async () => {
    const testEngine = { name: "accesslint", version: "0.14.1" };
    const testEnvironment = {
      userAgent: "Test Browser",
      windowWidth: 800,
      windowHeight: 600,
      orientationAngle: 0,
      orientationType: "portrait-primary",
    };
    const windowStub = {
      AccessLint: {
        runAudit: () => ({
          url: "https://example.com/",
          timestamp: 123,
          testEngine,
          testEnvironment,
          ruleCount: 94,
          skippedRules: [],
          violations: [],
        }),
      },
    };
    const documentStub = {};
    const expression = buildAuditExpression("", {});
    const evaluate = new Function(
      "window",
      "document",
      "expression",
      "return eval(expression);",
    ) as (window: unknown, document: unknown, expression: string) => Promise<string>;

    const parsed = JSON.parse(await evaluate(windowStub, documentStub, expression));

    expect(parsed.testEngine).toEqual(testEngine);
    expect(parsed.testEnvironment).toEqual(testEnvironment);
  });
});
