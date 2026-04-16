import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { definitionList } from "./definition-list";


describe("adaptable/definition-list", () => {
  it("passes valid dl", () => {
    const doc = makeDoc("<html><body><dl><dt>T</dt><dd>D</dd></dl></body></html>");
    expect(definitionList.run(doc)).toHaveLength(0);
  });

  it("reports invalid child in dl", () => {
    const doc = makeDoc("<html><body><dl><p>Bad</p></dl></body></html>");
    expect(definitionList.run(doc)).toHaveLength(1);
  });

  it("reports bare text node in dl", () => {
    const doc = makeDoc("<html><body><dl>Bare text<dt>T</dt><dd>D</dd></dl></body></html>");
    const violations = definitionList.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("<dt>");
  });
});
