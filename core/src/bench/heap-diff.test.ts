import { describe, it, expect } from "vitest";
import { countByClass, diffCounts, formatTopDeltas } from "./heap-diff";
import type { HeapSnapshot } from "./heap-diff";

/**
 * Minimal snapshot following the V8 format. node_fields stride is 5
 * (type, name, id, self_size, edge_count), which matches what Chromium
 * actually emits.
 */
function makeSnapshot(nodes: Array<{ type: string; name: string; id?: number }>): HeapSnapshot {
  const typeEnum = [
    "hidden",
    "array",
    "string",
    "object",
    "code",
    "closure",
    "regexp",
    "number",
    "native",
    "synthetic",
    "concatenated string",
    "sliced string",
  ];
  const stringsIndex = new Map<string, number>();
  const strings: string[] = [];
  const intern = (s: string): number => {
    let idx = stringsIndex.get(s);
    if (idx === undefined) {
      idx = strings.length;
      strings.push(s);
      stringsIndex.set(s, idx);
    }
    return idx;
  };

  const flat: number[] = [];
  for (const [i, n] of nodes.entries()) {
    const typeIdx = typeEnum.indexOf(n.type);
    if (typeIdx === -1) throw new Error(`unknown node type ${n.type}`);
    flat.push(typeIdx, intern(n.name), n.id ?? i, 0, 0);
  }

  return {
    snapshot: {
      meta: {
        node_fields: ["type", "name", "id", "self_size", "edge_count"],
        node_types: [typeEnum, "string", "number", "number", "number"],
      },
    },
    nodes: flat,
    strings,
  };
}

describe("countByClass", () => {
  it("buckets object and native nodes by name", () => {
    const snap = makeSnapshot([
      { type: "object", name: "Document" },
      { type: "object", name: "Document" },
      { type: "object", name: "HTMLDivElement" },
      { type: "native", name: "Node" },
      { type: "string", name: "hello" }, // excluded
      { type: "array", name: "" }, // excluded
      { type: "closure", name: "" }, // excluded
    ]);
    const counts = countByClass(snap);
    expect(counts.get("Document")).toBe(2);
    expect(counts.get("HTMLDivElement")).toBe(1);
    expect(counts.get("Node")).toBe(1);
    expect(counts.has("hello")).toBe(false);
  });

  it("throws when the format is missing required fields", () => {
    expect(() =>
      countByClass({
        snapshot: {
          meta: { node_fields: ["id"], node_types: [["string"]] },
        },
        nodes: [],
        strings: [],
      }),
    ).toThrow(/missing type or name/);
  });
});

describe("diffCounts", () => {
  it("reports classes that grew", () => {
    const before = new Map([
      ["Document", 1],
      ["Array", 5],
    ]);
    const after = new Map([
      ["Document", 3],
      ["Array", 5],
      ["NewThing", 1],
    ]);
    const delta = diffCounts(before, after);
    expect(delta.get("Document")).toBe(2);
    expect(delta.get("NewThing")).toBe(1);
    expect(delta.has("Array")).toBe(false);
  });

  it("reports classes that shrank", () => {
    const before = new Map([["Thing", 5]]);
    const after = new Map([["Thing", 2]]);
    const delta = diffCounts(before, after);
    expect(delta.get("Thing")).toBe(-3);
  });

  it("reports classes that disappeared", () => {
    const before = new Map([["Gone", 4]]);
    const after = new Map<string, number>();
    const delta = diffCounts(before, after);
    expect(delta.get("Gone")).toBe(-4);
  });

  it("omits unchanged classes", () => {
    const before = new Map([["Same", 3]]);
    const after = new Map([["Same", 3]]);
    const delta = diffCounts(before, after);
    expect(delta.size).toBe(0);
  });
});

describe("formatTopDeltas", () => {
  it("sorts by absolute delta and caps the output", () => {
    const delta = new Map([
      ["Small", 1],
      ["Big", 100],
      ["Shrink", -50],
      ["Medium", 10],
    ]);
    const out = formatTopDeltas(delta, 3);
    const lines = out.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Big");
    expect(lines[0]).toContain("+100");
    expect(lines[1]).toContain("Shrink");
    expect(lines[1]).toContain("-50");
    expect(lines[2]).toContain("Medium");
  });
});
