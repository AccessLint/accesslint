import { describe, it, expect } from "vitest";
import { duplicateIdAria } from "./duplicate-id-aria";
import { makeDoc } from "../../test-helpers";

describe("labels-and-names/duplicate-id-aria", () => {
  it("reports duplicate IDs referenced by aria-labelledby", () => {
    const doc = makeDoc(
      '<html><body><div id="a">Label</div><div id="a">Dup</div><input aria-labelledby="a"></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(1);
  });

  it("reports duplicate IDs referenced by label[for]", () => {
    const doc = makeDoc(
      '<html><body><input id="f"><input id="f"><label for="f">Name</label></body></html>'
    );
    const v = duplicateIdAria.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("label[for]");
  });

  it("reports duplicate IDs referenced by aria-describedby", () => {
    const doc = makeDoc(
      '<html><body><span id="d">Help</span><span id="d">Dup</span><input aria-describedby="d"></body></html>'
    );
    const v = duplicateIdAria.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("aria-describedby");
  });

  it("reports duplicate IDs referenced by aria-controls", () => {
    const doc = makeDoc(
      '<html><body><div id="panel">Content</div><div id="panel">Dup</div><button aria-controls="panel">Toggle</button></body></html>'
    );
    const v = duplicateIdAria.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toContain("aria-controls");
  });

  it("reports multiple distinct duplicate IDs in one document", () => {
    const doc = makeDoc(
      '<html><body>' +
        '<div id="a">A1</div><div id="a">A2</div><input aria-labelledby="a">' +
        '<div id="b">B1</div><div id="b">B2</div><input aria-describedby="b">' +
      '</body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(2);
  });

  it("ignores duplicate IDs not referenced by any accessibility attribute", () => {
    const doc = makeDoc(
      '<html><body><div id="a"></div><div id="a"></div></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(0);
  });

  it("passes when referenced IDs are unique", () => {
    const doc = makeDoc(
      '<html><body><div id="a">Label</div><input aria-labelledby="a"></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(0);
  });

  it("skips elements hidden with style display:none", () => {
    const doc = makeDoc(
      '<html><body><div id="x">Vis</div><div id="x" style="display:none">Hidden</div><input aria-labelledby="x"></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(0);
  });

  it("skips elements hidden with the hidden attribute", () => {
    const doc = makeDoc(
      '<html><body><div id="x">Vis</div><div id="x" hidden>Hidden</div><input aria-labelledby="x"></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(0);
  });

  it("ignores empty or whitespace-only ID values", () => {
    const doc = makeDoc(
      '<html><body><div id="">A</div><div id="">B</div><div id="  ">C</div><input aria-labelledby=""></body></html>'
    );
    expect(duplicateIdAria.run(doc)).toHaveLength(0);
  });
});
