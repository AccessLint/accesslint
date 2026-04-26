/**
 * In-house V3 source-map resolver. Handles both flat maps (single
 * `mappings` string) and sectioned/indexed maps (top-level `sections`
 * array — emitted by Turbopack, some Vite plugins, and others). Just
 * enough of the spec to resolve a generated (line, column) to an
 * original (source, line, column, name).
 *
 * Public API uses 1-based lines and 0-based columns to match the prevailing
 * convention from sourcemap libraries and the V3 spec output.
 */

export interface OriginalPosition {
  source: string;
  /** 1-based line in the original file. */
  line: number;
  /** 0-based column in the original file. */
  column: number;
  name: string | null;
}

interface FlatMap {
  sources: (string | null)[];
  names: string[];
  // Per 0-based generated line: segments sorted by generated column. Each
  // segment is [genCol, sourceIdx, origLine, origCol, nameIdx?] with all
  // values absolute (deltas already applied during decode). Segments of
  // length 1 (genCol only) are valid but yield no original position.
  lines: number[][][];
}

interface SectionedMap {
  sections: { offsetLine: number; offsetCol: number; map: FlatMap }[];
}

export type ParsedMap = FlatMap | SectionedMap;

function isSectioned(m: ParsedMap): m is SectionedMap {
  return Array.isArray((m as SectionedMap).sections);
}

// Base64 alphabet used by the V3 mappings VLQ encoding.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = (() => {
  const a = new Int8Array(128).fill(-1);
  for (let i = 0; i < 64; i++) a[B64.charCodeAt(i)] = i;
  return a;
})();

function decodeVlq(s: string, i: number): [value: number, next: number] {
  let result = 0;
  let shift = 0;
  let cont: number;
  do {
    if (i >= s.length) throw new Error("VLQ truncated");
    const digit = B64_LOOKUP[s.charCodeAt(i++)];
    if (digit < 0) throw new Error("VLQ: invalid base64 character");
    cont = digit & 32;
    result += (digit & 31) << shift;
    shift += 5;
  } while (cont);
  // Lowest bit is sign.
  const negative = result & 1;
  result >>>= 1;
  return [negative ? -result : result, i];
}

function decodeMappings(mappings: string): number[][][] {
  const lines: number[][][] = [];
  let segments: number[][] = [];
  let prevGenCol = 0;
  // Source/origLine/origCol/name deltas accumulate across the entire
  // mappings string, not per-line — only genCol resets per line.
  let prevSrcIdx = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;
  let prevNameIdx = 0;
  let i = 0;
  while (i < mappings.length) {
    const c = mappings.charCodeAt(i);
    if (c === 0x3b /* ; */) {
      lines.push(segments);
      segments = [];
      prevGenCol = 0;
      i++;
      continue;
    }
    if (c === 0x2c /* , */) {
      i++;
      continue;
    }
    const fields: number[] = [];
    while (i < mappings.length) {
      const cc = mappings.charCodeAt(i);
      if (cc === 0x2c || cc === 0x3b) break;
      const [v, ni] = decodeVlq(mappings, i);
      fields.push(v);
      i = ni;
    }
    switch (fields.length) {
      case 1:
        prevGenCol += fields[0];
        segments.push([prevGenCol]);
        break;
      case 4:
        prevGenCol += fields[0];
        prevSrcIdx += fields[1];
        prevOrigLine += fields[2];
        prevOrigCol += fields[3];
        segments.push([prevGenCol, prevSrcIdx, prevOrigLine, prevOrigCol]);
        break;
      case 5:
        prevGenCol += fields[0];
        prevSrcIdx += fields[1];
        prevOrigLine += fields[2];
        prevOrigCol += fields[3];
        prevNameIdx += fields[4];
        segments.push([prevGenCol, prevSrcIdx, prevOrigLine, prevOrigCol, prevNameIdx]);
        break;
      // Other field counts: malformed segment; skip silently.
    }
  }
  lines.push(segments);
  return lines;
}

interface RawMap {
  version?: number;
  sources?: (string | null)[];
  sourceRoot?: string;
  names?: string[];
  mappings?: string;
  sections?: { offset: { line: number; column: number }; map: RawMap }[];
}

function buildFlatMap(raw: RawMap): FlatMap {
  const root = raw.sourceRoot ? raw.sourceRoot.replace(/\/?$/, "/") : "";
  const sources = (raw.sources || []).map((s) => {
    if (s == null) return null;
    // sourceRoot is prefixed unless the source is already an absolute URL/path.
    if (root && !/^[a-z][a-z0-9+.-]*:/i.test(s) && !s.startsWith("/")) return root + s;
    return s;
  });
  return {
    sources,
    names: raw.names || [],
    lines: decodeMappings(raw.mappings || ""),
  };
}

export function parseSourceMap(text: string): ParsedMap | null {
  let raw: RawMap;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;

  try {
    if (Array.isArray(raw.sections)) {
      const sections = raw.sections
        .map((s) => ({
          offsetLine: s.offset.line,
          offsetCol: s.offset.column,
          map: buildFlatMap(s.map),
        }))
        .sort((a, b) => a.offsetLine - b.offsetLine || a.offsetCol - b.offsetCol);
      return { sections };
    }
    if (typeof raw.mappings === "string") {
      return buildFlatMap(raw);
    }
  } catch {
    return null;
  }
  return null;
}

function findSegment(segments: number[][], col: number): number[] | null {
  // Binary search for the largest segment whose genCol ≤ col.
  let lo = 0;
  let hi = segments.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (segments[mid][0] <= col) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 ? segments[lo - 1] : null;
}

function resolveFlat(m: FlatMap, line: number, column: number): OriginalPosition | null {
  const segs = m.lines[line - 1];
  if (!segs || segs.length === 0) return null;
  const seg = findSegment(segs, column);
  if (!seg || seg.length < 4) return null;
  const source = m.sources[seg[1]];
  if (source == null) return null;
  return {
    source,
    line: seg[2] + 1,
    column: seg[3],
    name: seg.length === 5 ? m.names[seg[4]] ?? null : null,
  };
}

/**
 * Resolve a generated (line, column) to its original position. `line` is
 * 1-based, `column` is 0-based — same convention as `originalPositionFor`
 * in `@jridgewell/trace-mapping`. Returns null when the position falls
 * outside any mapped segment.
 */
export function originalPositionFor(
  m: ParsedMap,
  line: number,
  column: number,
): OriginalPosition | null {
  if (isSectioned(m)) {
    // Sections are 0-based; the query line is 1-based.
    const queryLine0 = line - 1;
    let chosen: SectionedMap["sections"][number] | null = null;
    for (const s of m.sections) {
      if (
        s.offsetLine < queryLine0 ||
        (s.offsetLine === queryLine0 && s.offsetCol <= column)
      ) {
        chosen = s;
      } else {
        break;
      }
    }
    if (!chosen) return null;
    // Inner map's local line/column = query minus section offset. The first
    // line of the section is also the only one where the column offset applies.
    const localLine = queryLine0 - chosen.offsetLine + 1; // 1-based
    const localCol =
      queryLine0 === chosen.offsetLine ? column - chosen.offsetCol : column;
    return resolveFlat(chosen.map, localLine, localCol);
  }
  return resolveFlat(m, line, column);
}
