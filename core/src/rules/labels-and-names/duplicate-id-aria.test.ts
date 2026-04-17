import { describe, it } from "vitest";
import { duplicateIdAria } from "./duplicate-id-aria";
import { expectViolations, expectNoViolations } from "../../test-helpers";

const RULE_ID = "labels-and-names/duplicate-id-aria";

describe(RULE_ID, () => {
  it("reports duplicate IDs referenced by aria-labelledby", () => {
    expectViolations(
      duplicateIdAria,
      '<html><body><div id="a">Label</div><div id="a">Dup</div><input aria-labelledby="a"></body></html>',
      { count: 1, ruleId: RULE_ID },
    );
  });

  it("reports duplicate IDs referenced by label[for]", () => {
    expectViolations(
      duplicateIdAria,
      '<html><body><input id="f"><input id="f"><label for="f">Name</label></body></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /label\[for\]/ },
    );
  });

  it("reports duplicate IDs referenced by aria-describedby", () => {
    expectViolations(
      duplicateIdAria,
      '<html><body><span id="d">Help</span><span id="d">Dup</span><input aria-describedby="d"></body></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /aria-describedby/ },
    );
  });

  it("reports duplicate IDs referenced by aria-controls", () => {
    expectViolations(
      duplicateIdAria,
      '<html><body><div id="panel">Content</div><div id="panel">Dup</div><button aria-controls="panel">Toggle</button></body></html>',
      { count: 1, ruleId: RULE_ID, messageMatches: /aria-controls/ },
    );
  });

  it("reports multiple distinct duplicate IDs in one document", () => {
    expectViolations(
      duplicateIdAria,
      "<html><body>" +
        '<div id="a">A1</div><div id="a">A2</div><input aria-labelledby="a">' +
        '<div id="b">B1</div><div id="b">B2</div><input aria-describedby="b">' +
        "</body></html>",
      { count: 2, ruleId: RULE_ID },
    );
  });

  it("ignores duplicate IDs not referenced by any accessibility attribute", () => {
    expectNoViolations(
      duplicateIdAria,
      '<html><body><div id="a"></div><div id="a"></div></body></html>',
    );
  });

  it("passes when referenced IDs are unique", () => {
    expectNoViolations(
      duplicateIdAria,
      '<html><body><div id="a">Label</div><input aria-labelledby="a"></body></html>',
    );
  });

  it("skips elements hidden with style display:none", () => {
    expectNoViolations(
      duplicateIdAria,
      '<html><body><div id="x">Vis</div><div id="x" style="display:none">Hidden</div><input aria-labelledby="x"></body></html>',
    );
  });

  it("skips elements hidden with the hidden attribute", () => {
    expectNoViolations(
      duplicateIdAria,
      '<html><body><div id="x">Vis</div><div id="x" hidden>Hidden</div><input aria-labelledby="x"></body></html>',
    );
  });

  it("ignores empty or whitespace-only ID values", () => {
    expectNoViolations(
      duplicateIdAria,
      '<html><body><div id="">A</div><div id="">B</div><div id="  ">C</div><input aria-labelledby=""></body></html>',
    );
  });
});
