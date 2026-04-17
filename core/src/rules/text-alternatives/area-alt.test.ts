import { describe, it } from "vitest";
import { areaAlt } from "./area-alt";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "text-alternatives/area-alt";

describe(RULE_ID, () => {
  it("reports area without alt", () => {
    expectViolations(
      areaAlt,
      `
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,100,50">
      </map>
    `,
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("passes area with alt", () => {
    expectNoViolations(
      areaAlt,
      `
      <map name="nav">
        <area href="/home" alt="Home" shape="rect" coords="0,0,100,50">
      </map>
    `,
    );
  });

  it("passes area with aria-label", () => {
    expectNoViolations(
      areaAlt,
      `
      <map name="nav">
        <area href="/home" aria-label="Home" shape="rect" coords="0,0,100,50">
      </map>
    `,
    );
  });

  it("passes area with aria-labelledby", () => {
    expectNoViolations(
      areaAlt,
      `
      <span id="home-label">Home</span>
      <map name="nav">
        <area href="/home" aria-labelledby="home-label" shape="rect" coords="0,0,100,50">
      </map>
    `,
    );
  });

  it("skips area without href", () => {
    expectNoViolations(
      areaAlt,
      `
      <map name="nav">
        <area shape="default" alt="">
      </map>
    `,
    );
  });

  it("reports multiple areas without alt", () => {
    expectViolations(
      areaAlt,
      `
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,50,50">
        <area href="/about" shape="rect" coords="50,0,100,50">
      </map>
    `,
      { count: 2, ruleId: RULE_ID },
    );
  });

  it("skips aria-hidden areas", () => {
    expectNoViolations(
      areaAlt,
      `
      <map name="nav">
        <area href="/home" shape="rect" coords="0,0,100,50" aria-hidden="true">
      </map>
    `,
    );
  });
});
