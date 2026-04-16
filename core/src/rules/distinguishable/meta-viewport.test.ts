import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { metaViewport } from "./meta-viewport";


describe("distinguishable/meta-viewport", () => {
  it("passes without viewport meta", () => {
    const doc = makeDoc("<html><head></head><body></body></html>");
    expect(metaViewport.run(doc)).toHaveLength(0);
  });

  it("passes viewport without zoom restrictions", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head></html>');
    expect(metaViewport.run(doc)).toHaveLength(0);
  });

  it("reports user-scalable=no", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="user-scalable=no"></head></html>');
    const violations = metaViewport.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("user-scalable");
  });

  it("reports user-scalable=0", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="user-scalable=0"></head></html>');
    const violations = metaViewport.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports user-scalable=0.5 (fractional value disables zoom)", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="width=device-width, user-scalable=0.5"></head></html>');
    const violations = metaViewport.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("user-scalable=0.5");
  });

  it("passes user-scalable=1 (zoom enabled)", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="width=device-width, user-scalable=1"></head></html>');
    expect(metaViewport.run(doc)).toHaveLength(0);
  });

  it("passes user-scalable=yes", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="width=device-width, user-scalable=yes"></head></html>');
    expect(metaViewport.run(doc)).toHaveLength(0);
  });

  it("reports maximum-scale=1", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="maximum-scale=1"></head></html>');
    const violations = metaViewport.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("maximum-scale");
  });

  it("reports maximum-scale=1.5", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="maximum-scale=1.5"></head></html>');
    const violations = metaViewport.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes maximum-scale=2", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="maximum-scale=2"></head></html>');
    expect(metaViewport.run(doc)).toHaveLength(0);
  });

  it("passes maximum-scale=5", () => {
    const doc = makeDoc('<html><head><meta name="viewport" content="maximum-scale=5"></head></html>');
    expect(metaViewport.run(doc)).toHaveLength(0);
  });
});
