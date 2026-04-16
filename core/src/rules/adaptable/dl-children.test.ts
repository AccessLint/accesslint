import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { dlChildren } from "./dl-children";


describe("adaptable/dl-children", () => {
  it("passes dt/dd inside dl", () => {
    const doc = makeDoc("<html><body><dl><dt>T</dt><dd>D</dd></dl></body></html>");
    expect(dlChildren.run(doc)).toHaveLength(0);
  });

  it("passes dt/dd inside div inside dl", () => {
    const doc = makeDoc("<html><body><dl><div><dt>T</dt><dd>D</dd></div></dl></body></html>");
    expect(dlChildren.run(doc)).toHaveLength(0);
  });

  it("reports dt outside dl", () => {
    const doc = makeDoc("<html><body><dt>Bad</dt></body></html>");
    expect(dlChildren.run(doc)).toHaveLength(1);
  });
});
