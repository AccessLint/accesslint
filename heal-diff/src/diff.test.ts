import { describe, it, expect } from "vitest";
import { diff, buildTier, type DiffItem, type Tier } from "./index";

type Sig = "selector" | "anchor" | "htmlFingerprint" | "relativeLocation" | "tag";

const T1 = buildTier<Sig>({ name: "exact", key: ["id", "selector"], heal: false });
const T2 = buildTier<Sig>({ name: "anchor", key: ["id", "anchor"], heal: true });
const T5 = buildTier<Sig>({ name: "htmlFingerprint", key: ["id", "htmlFingerprint"], heal: true });
const T6 = buildTier<Sig>({
  name: "relativeLocation",
  key: ["id", "relativeLocation", "tag"],
  heal: true,
  uniquenessGated: true,
});

function item(id: string, signals: Partial<Record<Sig, string>>): DiffItem<Sig> {
  return { id, signals };
}

describe("diff() — T1 regression lock", () => {
  it("reproduces compareViolations exact-match semantics", () => {
    const baseline = [
      item("a", { selector: "img" }),
      item("b", { selector: "html" }),
    ];
    const current = [
      item("a", { selector: "img" }),
      item("c", { selector: "h1" }),
    ];
    const result = diff(baseline, current, [T1]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].baseline.id).toBe("a");
    expect(result.healed).toHaveLength(0);
    expect(result.fixed.map((i) => i.id)).toEqual(["b"]);
    expect(result.new.map((i) => i.id)).toEqual(["c"]);
  });

  it("handles duplicate items by count", () => {
    const sel = "img";
    const baseline = [
      item("a", { selector: sel }),
      item("a", { selector: sel }),
    ];
    const current = [
      item("a", { selector: sel }),
      item("a", { selector: sel }),
      item("a", { selector: sel }),
    ];
    const result = diff(baseline, current, [T1]);
    expect(result.matched).toHaveLength(2);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(0);
  });
});

describe("diff() — healing tiers", () => {
  it("prefers T1 exact over T2 anchor when both match", () => {
    const baseline = [item("img-alt", { selector: "html > body > img", anchor: "data-testid=hero" })];
    const current = [item("img-alt", { selector: "html > body > img", anchor: "data-testid=hero" })];
    const result = diff(baseline, current, [T1, T2]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].tier).toBe("exact");
    expect(result.healed).toHaveLength(0);
  });

  it("heals via T2 anchor when selector changed but anchor matches", () => {
    const baseline = [item("img-alt", { selector: "body > img", anchor: "data-testid=hero" })];
    const current = [item("img-alt", { selector: "main > figure > img", anchor: "data-testid=hero" })];
    const result = diff(baseline, current, [T1, T2]);
    expect(result.matched).toHaveLength(0);
    expect(result.healed).toHaveLength(1);
    expect(result.healed[0].tier).toBe("anchor");
    expect(result.healed[0].baseline.signals.selector).toBe("body > img");
    expect(result.healed[0].current.signals.selector).toBe("main > figure > img");
  });

  it("heals via T5 htmlFingerprint when only that signal survives", () => {
    const baseline = [item("img-alt", { selector: "body > img", htmlFingerprint: "abc123" })];
    const current = [item("img-alt", { selector: "main > img", htmlFingerprint: "abc123" })];
    const result = diff(baseline, current, [T1, T2, T5]);
    expect(result.healed).toHaveLength(1);
    expect(result.healed[0].tier).toBe("htmlFingerprint");
  });

  it("skips a tier when an item is missing its signals", () => {
    const baseline = [item("img-alt", { selector: "body > img" })];
    const current = [item("img-alt", { selector: "main > img", anchor: "data-testid=hero" })];
    const result = diff(baseline, current, [T1, T2]);
    expect(result.healed).toHaveLength(0);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(1);
  });

  it("never matches across different ids", () => {
    const baseline = [item("img-alt", { anchor: "data-testid=hero" })];
    const current = [item("button-name", { anchor: "data-testid=hero" })];
    const result = diff(baseline, current, [T2]);
    expect(result.healed).toHaveLength(0);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(1);
  });
});

describe("diff() — uniqueness-gated tier", () => {
  it("heals when exactly one baseline candidate matches", () => {
    const baseline = [
      item("img-alt", { selector: "body > img:nth-of-type(1)", relativeLocation: "main", tag: "img" }),
    ];
    const current = [
      item("img-alt", { selector: "main > figure > img", relativeLocation: "main", tag: "img" }),
    ];
    const result = diff(baseline, current, [T1, T6]);
    expect(result.healed).toHaveLength(1);
    expect(result.healed[0].tier).toBe("relativeLocation");
  });

  it("refuses to heal when two baseline candidates share the key", () => {
    const baseline = [
      item("img-alt", { selector: "body > img:nth-of-type(1)", relativeLocation: "main", tag: "img" }),
      item("img-alt", { selector: "body > img:nth-of-type(2)", relativeLocation: "main", tag: "img" }),
    ];
    const current = [item("img-alt", { selector: "main > figure > img", relativeLocation: "main", tag: "img" })];
    const result = diff(baseline, current, [T1, T6]);
    expect(result.healed).toHaveLength(0);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(2);
  });
});

describe("diff() — likelyMoved", () => {
  it("attaches a candidate when two-of-three weak signals overlap", () => {
    const baseline = [
      item("img-alt", {
        selector: "body > header > img",
        tag: "img",
        htmlFingerprint: "abc123",
        relativeLocation: "header",
      }),
    ];
    const current = [
      item("img-alt", {
        selector: "body > footer > img",
        tag: "img",
        htmlFingerprint: "abc123",
        relativeLocation: "footer",
      }),
    ];
    const result = diff(baseline, current, [T1]);
    expect(result.likelyMoved).toHaveLength(1);
    expect(result.likelyMoved[0].sharedSignals.sort()).toEqual(["htmlFingerprint", "tag"]);
  });

  it("does not attach when only one signal overlaps", () => {
    const baseline = [item("img-alt", { selector: "a", tag: "img" })];
    const current = [item("img-alt", { selector: "b", tag: "img" })];
    const result = diff(baseline, current, [T1]);
    expect(result.likelyMoved).toHaveLength(0);
  });

  it("does not attach across different ids", () => {
    const baseline = [item("img-alt", { tag: "img", htmlFingerprint: "x", relativeLocation: "main" })];
    const current = [item("button-name", { tag: "img", htmlFingerprint: "x", relativeLocation: "main" })];
    const result = diff(baseline, current, [T1]);
    expect(result.likelyMoved).toHaveLength(0);
  });
});

describe("diff() — count-based at every tier", () => {
  it("two anchored baseline + three anchored current → two heal, one new", () => {
    const baseline = [
      item("img-alt", { anchor: "data-testid=hero" }),
      item("img-alt", { anchor: "data-testid=hero" }),
    ];
    const current = [
      item("img-alt", { anchor: "data-testid=hero" }),
      item("img-alt", { anchor: "data-testid=hero" }),
      item("img-alt", { anchor: "data-testid=hero" }),
    ];
    const result = diff(baseline, current, [T2]);
    expect(result.healed).toHaveLength(2);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(0);
  });
});

describe("diff() — grouping", () => {
  it("groups new violations by htmlFingerprint", () => {
    const current = [
      item("img-alt", { htmlFingerprint: "abc" }),
      item("img-alt", { htmlFingerprint: "abc" }),
      item("img-alt", { htmlFingerprint: "def" }),
    ];
    const result = diff<Sig>([], current, [T1], { grouping: { by: ["htmlFingerprint"] } });
    expect(result.newGroups).toHaveLength(2);
    const groupsByFp = Object.fromEntries(
      result.newGroups!.map((g) => [g.signals.htmlFingerprint, g.count]),
    );
    expect(groupsByFp).toEqual({ abc: 2, def: 1 });
  });

  it("respects id in the group key so different rules never merge", () => {
    const current = [
      item("img-alt", { htmlFingerprint: "abc" }),
      item("button-name", { htmlFingerprint: "abc" }),
    ];
    const result = diff<Sig>([], current, [T1], { grouping: { by: ["htmlFingerprint"] } });
    expect(result.newGroups).toHaveLength(2);
  });
});
