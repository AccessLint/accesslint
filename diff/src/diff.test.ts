import { describe, it, expect } from "vitest";
import { selectShard, type DiffReport } from "./diff.js";
import { renderMarkdown } from "./format.js";

describe("selectShard", () => {
  it("returns all routes when numShards <= 1", () => {
    expect(selectShard(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("strides routes across shards", () => {
    const routes = ["a", "b", "c", "d", "e"];
    expect(selectShard(routes, 2, 0)).toEqual(["a", "c", "e"]);
    expect(selectShard(routes, 2, 1)).toEqual(["b", "d"]);
  });

  it("partitions fully and disjointly across all shards", () => {
    const routes = Array.from({ length: 20 }, (_, i) => `r${i}`);
    const numShards = 4;
    const recombined = [0, 1, 2, 3].flatMap((i) => selectShard(routes, numShards, i));
    expect([...recombined].sort()).toEqual([...routes].sort());
  });
});

describe("renderMarkdown", () => {
  const report: DiffReport = {
    routes: [
      {
        route: "Button",
        status: "ok",
        newViolations: [
          {
            ruleId: "labels-and-names/button-name",
            selector: "button",
            impact: "critical",
            message: "Button has no discernible text.",
          },
        ],
        fixedViolations: [],
        preExisting: 2,
      },
      {
        route: "Card",
        status: "ok",
        newViolations: [],
        fixedViolations: [{ ruleId: "img-alt", selector: "img" }],
        preExisting: 1,
      },
    ],
    totals: { newViolations: 1, fixedViolations: 1, preExisting: 3, skipped: 0 },
  };

  it("renders new + fixed sections with totals", () => {
    const md = renderMarkdown(report, "next-master");
    expect(md).toContain("**1 new** · 1 fixed · 3 pre-existing");
    expect(md).toContain("labels-and-names/button-name");
    expect(md).toContain("Button has no discernible text.");
    expect(md).toContain("### Fixed");
    expect(md).toContain("img-alt");
  });

  it("celebrates when there are no changes", () => {
    const empty: DiffReport = {
      routes: [],
      totals: { newViolations: 0, fixedViolations: 0, preExisting: 0, skipped: 0 },
    };
    expect(renderMarkdown(empty)).toContain("No accessibility changes introduced");
  });
});
