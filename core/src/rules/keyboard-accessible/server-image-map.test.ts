import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { serverImageMap } from "./server-image-map";

const RULE_ID = "keyboard-accessible/server-image-map";

describe(RULE_ID, () => {
  it("reports img with ismap attribute", () => {
    expectViolations(serverImageMap, '<a href="/map"><img src="map.png" alt="Map" ismap></a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports input[type=image] with ismap attribute", () => {
    expectViolations(serverImageMap, '<input type="image" src="map.png" ismap>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes img without ismap", () => {
    expectNoViolations(serverImageMap, '<img src="photo.jpg" alt="Photo">');
  });

  it("passes img with client-side usemap", () => {
    expectNoViolations(serverImageMap, '<img src="nav.png" alt="Navigation" usemap="#navmap">');
  });

  it("skips aria-hidden img with ismap", () => {
    expectNoViolations(serverImageMap, '<img src="map.png" alt="Map" ismap aria-hidden="true">');
  });

  it("reports multiple server-side image maps", () => {
    expectViolations(
      serverImageMap,
      '<a href="/a"><img src="a.png" alt="A" ismap></a><a href="/b"><img src="b.png" alt="B" ismap></a>',
      { count: 2, ruleId: RULE_ID },
    );
  });
});
