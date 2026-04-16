import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { metaRefreshNoException } from "./meta-refresh-no-exception";


describe("enough-time/meta-refresh-no-exception", () => {
  it("passes without refresh meta", () => {
    const doc = makeDoc("<html><head></head><body></body></html>");
    expect(metaRefreshNoException.run(doc)).toHaveLength(0);
  });

  it("allows immediate redirect (delay 0)", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>');
    expect(metaRefreshNoException.run(doc)).toHaveLength(0);
  });

  it("reports timed redirect", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="5;url=/new-page"></head></html>');
    const violations = metaRefreshNoException.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("enough-time/meta-refresh-no-exception");
    expect(violations[0].message).toContain("5-second");
  });

  it("reports same-page refresh with positive delay", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="30"></head></html>');
    const violations = metaRefreshNoException.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("30-second");
  });

  it("reports very long redirect (no 72000 exception)", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="100000;url=/new-page"></head></html>');
    const violations = metaRefreshNoException.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("100000-second");
  });

  it("passes delay 0 with no URL", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="0"></head></html>');
    expect(metaRefreshNoException.run(doc)).toHaveLength(0);
  });

  it("ignores malformed content attribute", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="abc"></head></html>');
    expect(metaRefreshNoException.run(doc)).toHaveLength(0);
  });
});
