import { describe, expect, it } from "vitest";
import { auditSource } from "./audit";
import { attributeName } from "./jsx/attributes";
import { attributeDependencies, CHILD_DEPENDENT_RULES, DEPENDS_ON_ANY_UNKNOWN } from "./semantics";
import { testDocument } from "./test-dom";
import type { SourceAuditResult } from "./types";

// The decision-11 invariants, stated as properties over a corpus of component
// shapes crossed with the mutations that introduce each kind of unknown. Every
// one of these is a claim about the package as a whole, not about a rule: adding
// an unknown to a file can only ever remove findings, and a removed finding is
// always still recorded as a candidate.

/** One element per rule family that fires on a static, fully-known shape. */
const SHAPES = [
  `<img src="/a.png" />`,
  `<img src="/a.png" alt=" " />`,
  `<button></button>`,
  `<a href="/x"></a>`,
  `<h2></h2>`,
  `<ul><div>Item</div></ul>`,
  `<div tabIndex={5}></div>`,
  `<input type="text" autoComplete="banana" />`,
  `<div role="banana"></div>`,
  `<div aria-lbel="Close"></div>`,
  `<table><tr><td>1</td></tr></table>`,
  `<dl><span>Term</span></dl>`,
  `<video src="/a.mp4" controls></video>`,
];

function component(jsx: string): string {
  return `export const Shape = (props) => (\n  ${jsx}\n);`;
}

function audit(jsx: string): SourceAuditResult {
  return auditSource({
    source: component(jsx),
    filename: "Shape.tsx",
    document: testDocument(),
  });
}

function ids(findings: { ruleId: string }[]): Set<string> {
  return new Set(findings.map((finding) => finding.ruleId));
}

/** `<img …/>` becomes `<img {...props} …/>`: the spread comes first. */
function spreadFirst(jsx: string): string {
  return jsx.replace(/^<([a-zA-Z][\w-]*)/, "<$1 {...props}");
}

/** Every literal attribute value becomes an expression. */
function expressionValues(jsx: string): string {
  return jsx.replace(/="([^"]*)"/g, "={value}");
}

/** An opaque expression joins the outermost element's children. */
function opaqueChild(jsx: string): string {
  const match = /^<([a-zA-Z][\w-]*)([^>]*)>/.exec(jsx);
  if (!match || match[2].trimEnd().endsWith("/")) return jsx;
  return jsx.replace(match[0], `${match[0]}{stuff}`);
}

/** The HTML attribute names a shape writes, however their values are given. */
function attributeNames(jsx: string): string[] {
  return names(jsx, /([a-zA-Z][\w:-]*)=["{]/g);
}

/** Only the string-literal ones — the values `expressionValues` makes unknown. */
function quotedAttributeNames(jsx: string): string[] {
  return names(jsx, /([a-zA-Z][\w:-]*)="/g);
}

function names(jsx: string, pattern: RegExp): string[] {
  return [...jsx.matchAll(pattern)]
    .map(([, prop]) => attributeName(prop))
    .filter((name): name is string => name !== null);
}

describe("silence only grows", () => {
  for (const shape of SHAPES) {
    it(`no mutation of ${shape} invents a finding`, () => {
      const base = ids(audit(shape).findings);
      for (const mutate of [spreadFirst, expressionValues, opaqueChild]) {
        const mutated = audit(mutate(shape));
        for (const ruleId of ids(mutated.findings)) {
          expect(base, `${mutate.name} on ${shape} invented ${ruleId}`).toContain(ruleId);
        }
      }
    });

    // Stated for the spread only, and deliberately. A spread leaves the
    // evidence alone — the engine still fires, and suppression records a
    // candidate for the unsuppression layer to adjudicate. The other two
    // mutations *replace* the evidence with a stand-in, so the engine may never
    // fire at all: `alt={label}` reads as a named image, and there is no
    // violation left to record. That is the accepted edge of the candidate
    // model, not a leak.
    it(`every finding ${shape} proves becomes a candidate under a spread`, () => {
      const base = ids(audit(shape).findings);
      const mutated = audit(spreadFirst(shape));
      const kept = new Set([...ids(mutated.findings), ...ids(mutated.candidates)]);
      for (const ruleId of base) {
        expect(kept, `a spread on ${shape} dropped ${ruleId} silently`).toContain(ruleId);
      }
    });
  }
});

describe("a spread makes absence unprovable", () => {
  for (const shape of SHAPES) {
    it(`${shape} keeps only rules the source pins after the spread`, () => {
      // The spread comes first, so every attribute the source writes is pinned
      // and nothing else is. A rule survives only if the source writes every
      // attribute it reads — and a rule with no dependency table never does.
      const pinned = new Set(attributeNames(shape));
      for (const ruleId of ids(audit(spreadFirst(shape)).findings)) {
        const dependencies = attributeDependencies(ruleId);
        expect(dependencies, `${ruleId} has no dependency table`).not.toBe(DEPENDS_ON_ANY_UNKNOWN);
        for (const attribute of dependencies) {
          expect(pinned, `${ruleId} survived on an unpinned ${attribute}`).toContain(attribute);
        }
      }
    });
  }
});

describe("an expression value silences the rules that read it", () => {
  for (const shape of SHAPES) {
    const attributes = quotedAttributeNames(shape);
    if (attributes.length === 0) continue;
    it(`${shape} silences every rule reading ${attributes.join(", ")}`, () => {
      const mutated = audit(expressionValues(shape));
      for (const ruleId of ids(mutated.findings)) {
        const dependencies = attributeDependencies(ruleId);
        expect(dependencies, `${ruleId} read an expression value`).not.toBe(DEPENDS_ON_ANY_UNKNOWN);
        for (const attribute of attributes) {
          expect(dependencies, `${ruleId} read ${attribute}`).not.toContain(attribute);
        }
      }
    });
  }
});

describe("an opaque child silences the rules that read contents", () => {
  for (const shape of SHAPES) {
    const mutated = opaqueChild(shape);
    if (mutated === shape) continue;
    it(`${shape} silences its container rules`, () => {
      for (const ruleId of ids(audit(mutated).findings)) {
        expect(CHILD_DEPENDENT_RULES, `${ruleId} read unknown contents`).not.toContain(ruleId);
      }
    });
  }
});

describe("nothing of ours reaches the output", () => {
  it("never leaks a marker attribute", () => {
    for (const shape of SHAPES) {
      for (const mutate of [(s: string) => s, spreadFirst, expressionValues, opaqueChild]) {
        const result = audit(mutate(shape));
        expect(result.html).not.toContain("data-accesslint");
        for (const finding of [...result.findings, ...result.candidates]) {
          expect(finding.html).not.toContain("data-accesslint");
          expect(finding.context ?? "").not.toContain("data-accesslint");
        }
      }
    }
  });
});

describe("an unreadable file is silent, not fatal", () => {
  const broken = [
    "",
    "   ",
    "export const A = () => <div>",
    "<<<>>>",
    "%%%not javascript at all%%%",
    "export const A = () => <div className={{{ }} />",
    "\u0000\u0001\u0002",
    `export const A = () => <div>${"<span>".repeat(200)}`,
  ];

  for (const source of broken) {
    it(`survives ${JSON.stringify(source.slice(0, 24))}`, () => {
      const result = auditSource({ source, filename: "Broken.tsx", document: testDocument() });
      if (!result.parsed) {
        expect(result.findings).toEqual([]);
        expect(result.candidates).toEqual([]);
      }
    });
  }
});
