import { describe, it, expect } from "vitest";
import { areaAlt } from "./area-alt";
import { makeDoc } from "../../test-helpers";

describe("text-alternatives/area-alt", () => {
  it("reports area without alt", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,100,50">
      </map>
    `);
    const violations = areaAlt.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("text-alternatives/area-alt");
  });

  it("passes area with alt", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area href="/home" alt="Home" shape="rect" coords="0,0,100,50">
      </map>
    `);
    expect(areaAlt.run(doc)).toHaveLength(0);
  });

  it("passes area with aria-label", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area href="/home" aria-label="Home" shape="rect" coords="0,0,100,50">
      </map>
    `);
    expect(areaAlt.run(doc)).toHaveLength(0);
  });

  it("passes area with aria-labelledby", () => {
    const doc = makeDoc(`
      <span id="home-label">Home</span>
      <map name="nav">
        <area href="/home" aria-labelledby="home-label" shape="rect" coords="0,0,100,50">
      </map>
    `);
    expect(areaAlt.run(doc)).toHaveLength(0);
  });

  it("skips area without href", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area shape="default" alt="">
      </map>
    `);
    expect(areaAlt.run(doc)).toHaveLength(0);
  });

  it("reports multiple areas without alt", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,50,50">
        <area href="/about" shape="rect" coords="50,0,100,50">
      </map>
    `);
    const violations = areaAlt.run(doc);
    expect(violations).toHaveLength(2);
  });

  it("skips aria-hidden areas", () => {
    const doc = makeDoc(`
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,100,50" aria-hidden="true">
      </map>
    `);
    expect(areaAlt.run(doc)).toHaveLength(0);
  });
});
