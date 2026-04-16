import { describe, it, expect } from "vitest";
import { serverImageMap } from "./server-image-map";
import { makeDoc } from "../../test-helpers";

describe("keyboard-accessible/server-image-map", () => {
  it("reports img with ismap attribute", () => {
    const doc = makeDoc('<a href="/map"><img src="map.png" alt="Map" ismap></a>');
    const violations = serverImageMap.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("keyboard-accessible/server-image-map");
  });

  it("reports input[type=image] with ismap attribute", () => {
    const doc = makeDoc('<input type="image" src="map.png" ismap>');
    const violations = serverImageMap.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes img without ismap", () => {
    const doc = makeDoc('<img src="photo.jpg" alt="Photo">');
    expect(serverImageMap.run(doc)).toHaveLength(0);
  });

  it("passes img with client-side usemap", () => {
    const doc = makeDoc('<img src="nav.png" alt="Navigation" usemap="#navmap">');
    expect(serverImageMap.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden img with ismap", () => {
    const doc = makeDoc('<img src="map.png" alt="Map" ismap aria-hidden="true">');
    expect(serverImageMap.run(doc)).toHaveLength(0);
  });

  it("reports multiple server-side image maps", () => {
    const doc = makeDoc('<a href="/a"><img src="a.png" alt="A" ismap></a><a href="/b"><img src="b.png" alt="B" ismap></a>');
    expect(serverImageMap.run(doc)).toHaveLength(2);
  });
});
