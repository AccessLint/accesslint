import { describe, it, expect } from "vitest";
import { parseSourceMap, originalPositionFor } from "./source-map";

const VLQ_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encodeVlq(value: number): string {
  let v = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = v & 31;
    v >>>= 5;
    if (v > 0) digit |= 32;
    out += VLQ_B64[digit];
  } while (v > 0);
  return out;
}

function encodeMappings(decoded: number[][][]): string {
  let prevSrcIdx = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;
  let prevNameIdx = 0;
  return decoded
    .map((line) => {
      let prevGenCol = 0;
      return line
        .map((seg) => {
          const parts: number[] = [seg[0] - prevGenCol];
          prevGenCol = seg[0];
          if (seg.length >= 4) {
            parts.push(seg[1] - prevSrcIdx);
            prevSrcIdx = seg[1];
            parts.push(seg[2] - prevOrigLine);
            prevOrigLine = seg[2];
            parts.push(seg[3] - prevOrigCol);
            prevOrigCol = seg[3];
          }
          if (seg.length === 5) {
            parts.push(seg[4] - prevNameIdx);
            prevNameIdx = seg[4];
          }
          return parts.map(encodeVlq).join("");
        })
        .join(",");
    })
    .join(";");
}

function flatMap(opts: {
  sources: string[];
  names?: string[];
  segments: number[][][];
}): string {
  return JSON.stringify({
    version: 3,
    sources: opts.sources,
    names: opts.names || [],
    mappings: encodeMappings(opts.segments),
  });
}

describe("parseSourceMap + originalPositionFor", () => {
  describe("flat maps", () => {
    it("resolves a simple mapping", () => {
      const text = flatMap({
        sources: ["src/Card.tsx"],
        // gen line 1, col 5 → orig line 10, col 3 (0-based: line 9, col 2)
        segments: [[[5, 0, 9, 2]]],
      });
      const m = parseSourceMap(text)!;
      expect(m).toBeTruthy();
      expect(originalPositionFor(m, 1, 5)).toEqual({
        source: "src/Card.tsx",
        line: 10,
        column: 2,
        name: null,
      });
    });

    it("resolves names when nameIdx is present", () => {
      const text = flatMap({
        sources: ["src/X.tsx"],
        names: ["MyComponent"],
        segments: [[[0, 0, 0, 0, 0]]],
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)).toEqual({
        source: "src/X.tsx",
        line: 1,
        column: 0,
        name: "MyComponent",
      });
    });

    it("returns null when the line has no segments", () => {
      const text = flatMap({ sources: ["x"], segments: [[], [[0, 0, 0, 0]]] });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)).toBeNull();
      expect(originalPositionFor(m, 2, 0)).not.toBeNull();
    });

    it("picks the greatest segment with genCol ≤ query column", () => {
      const text = flatMap({
        sources: ["s.ts"],
        // line 1: segments at cols 0, 10, 25 mapping to orig lines 1,2,3
        segments: [
          [
            [0, 0, 0, 0],
            [10, 0, 1, 0],
            [25, 0, 2, 0],
          ],
        ],
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)?.line).toBe(1);
      expect(originalPositionFor(m, 1, 9)?.line).toBe(1);
      expect(originalPositionFor(m, 1, 10)?.line).toBe(2);
      expect(originalPositionFor(m, 1, 24)?.line).toBe(2);
      expect(originalPositionFor(m, 1, 25)?.line).toBe(3);
      expect(originalPositionFor(m, 1, 1000)?.line).toBe(3);
    });

    it("returns null for a query before any segment", () => {
      const text = flatMap({
        sources: ["s.ts"],
        segments: [[[5, 0, 0, 0]]],
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)).toBeNull();
      expect(originalPositionFor(m, 1, 4)).toBeNull();
      expect(originalPositionFor(m, 1, 5)).not.toBeNull();
    });

    it("handles 1-field segments (genCol only) by returning null", () => {
      const text = JSON.stringify({
        version: 3,
        sources: ["s.ts"],
        names: [],
        // Mappings = "AAAA;A" means a 4-field segment on line 1 then a 1-field (genCol only) on line 2.
        // Use a 1-field segment alone on line 1 to test.
        mappings: encodeMappings([[[0]], [[0, 0, 0, 0]]]),
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)).toBeNull();
      expect(originalPositionFor(m, 2, 0)).not.toBeNull();
    });
  });

  describe("sectioned (indexed) maps", () => {
    function sectionedMap(sections: { offset: { line: number; column: number }; map: object }[]): string {
      return JSON.stringify({ version: 3, sections });
    }

    it("dispatches to the correct section by generated line", () => {
      const text = sectionedMap([
        // Section 1: covers gen lines 0..9 (offset 0,0), maps to file A
        {
          offset: { line: 0, column: 0 },
          map: JSON.parse(flatMap({ sources: ["a.ts"], segments: [[[0, 0, 0, 0]]] })),
        },
        // Section 2: covers gen lines 10+, maps to file B
        {
          offset: { line: 10, column: 0 },
          map: JSON.parse(flatMap({ sources: ["b.ts"], segments: [[[0, 0, 0, 0]]] })),
        },
      ]);
      const m = parseSourceMap(text)!;
      // Query gen line 1 → section 1
      expect(originalPositionFor(m, 1, 0)?.source).toBe("a.ts");
      // Query gen line 11 → section 2
      expect(originalPositionFor(m, 11, 0)?.source).toBe("b.ts");
    });

    it("translates query coords into section-local coords (line offset)", () => {
      // Section starts at gen line 4 (0-based). User wants gen line 5 (1-based). That's section-local line 1.
      const text = sectionedMap([
        {
          offset: { line: 4, column: 0 },
          map: JSON.parse(
            flatMap({
              sources: ["mod.ts"],
              segments: [[[0, 0, 41, 6]]], // local line 1 → orig line 42 col 6
            }),
          ),
        },
      ]);
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 5, 0)).toMatchObject({
        source: "mod.ts",
        line: 42,
        column: 6,
      });
    });

    it("translates query coords into section-local coords (column offset on first line)", () => {
      // Section offset (line 0, col 100) — query at gen line 1, col 105 → section-local line 1, col 5
      const text = sectionedMap([
        {
          offset: { line: 0, column: 100 },
          map: JSON.parse(
            flatMap({
              sources: ["m.ts"],
              segments: [[[5, 0, 0, 0]]],
            }),
          ),
        },
      ]);
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 105)).toMatchObject({
        source: "m.ts",
        line: 1,
        column: 0,
      });
      // Query before the section's column offset → no match.
      expect(originalPositionFor(m, 1, 50)).toBeNull();
    });

    it("returns null for queries before any section", () => {
      const text = sectionedMap([
        {
          offset: { line: 5, column: 0 },
          map: JSON.parse(flatMap({ sources: ["x.ts"], segments: [[[0, 0, 0, 0]]] })),
        },
      ]);
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)).toBeNull();
      expect(originalPositionFor(m, 5, 0)).toBeNull(); // gen line 5 is 1-based, section starts at 0-based line 5 = gen line 6
      expect(originalPositionFor(m, 6, 0)).not.toBeNull();
    });
  });

  describe("error handling", () => {
    it("returns null on invalid JSON", () => {
      expect(parseSourceMap("not json")).toBeNull();
      expect(parseSourceMap("")).toBeNull();
    });

    it("returns null when neither mappings nor sections is present", () => {
      expect(parseSourceMap(JSON.stringify({ version: 3, sources: [] }))).toBeNull();
    });

    it("returns null on malformed VLQ", () => {
      expect(
        parseSourceMap(
          JSON.stringify({ version: 3, sources: ["x"], names: [], mappings: "@@@@" }),
        ),
      ).toBeNull();
    });
  });

  describe("sourceRoot", () => {
    it("prefixes relative source paths with sourceRoot", () => {
      const text = JSON.stringify({
        version: 3,
        sourceRoot: "https://example.com/src",
        sources: ["foo.ts"],
        names: [],
        mappings: encodeMappings([[[0, 0, 0, 0]]]),
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)?.source).toBe("https://example.com/src/foo.ts");
    });

    it("does not prefix absolute URLs or absolute paths", () => {
      const text = JSON.stringify({
        version: 3,
        sourceRoot: "/src",
        sources: ["https://cdn/foo.ts", "/abs/bar.ts"],
        names: [],
        mappings: encodeMappings([
          [
            [0, 0, 0, 0],
            [10, 1, 0, 0],
          ],
        ]),
      });
      const m = parseSourceMap(text)!;
      expect(originalPositionFor(m, 1, 0)?.source).toBe("https://cdn/foo.ts");
      expect(originalPositionFor(m, 1, 10)?.source).toBe("/abs/bar.ts");
    });
  });
});
