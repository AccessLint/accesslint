import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { metaRefresh } from "./meta-refresh";


describe("enough-time/meta-refresh", () => {
  it("passes without refresh meta", () => {
    const doc = makeDoc("<html><head></head><body></body></html>");
    expect(metaRefresh.run(doc)).toHaveLength(0);
  });

  it("reports timed redirect", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="5;url=/new-page"></head></html>');
    const violations = metaRefresh.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("redirects");
    expect(violations[0].message).toContain("5 seconds");
  });

  it("allows immediate redirect (delay 0)", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="0;url=/new-page"></head></html>');
    const violations = metaRefresh.run(doc);
    expect(violations).toHaveLength(0);
  });

  it("reports auto-refresh", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="30"></head></html>');
    const violations = metaRefresh.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("30 seconds");
  });

  it("passes very long refresh interval", () => {
    const doc = makeDoc('<html><head><meta http-equiv="refresh" content="100000"></head></html>');
    expect(metaRefresh.run(doc)).toHaveLength(0);
  });
});
