import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { focusVisible } from "./focus-visible";


describe("keyboard-accessible/focus-visible", () => {
  it("reports outline:none without alternative", () => {
    const doc = makeDoc('<button style="outline: none;">Click</button>');
    const violations = focusVisible.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("outline");
  });

  it("passes outline:none with border", () => {
    const doc = makeDoc('<button style="outline: none; border: 2px solid blue;">Click</button>');
    expect(focusVisible.run(doc)).toHaveLength(0);
  });

  it("passes outline:none with box-shadow", () => {
    const doc = makeDoc('<button style="outline: none; box-shadow: 0 0 3px blue;">Click</button>');
    expect(focusVisible.run(doc)).toHaveLength(0);
  });

  it("passes element with no inline outline style", () => {
    const doc = makeDoc("<button>Click</button>");
    expect(focusVisible.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements", () => {
    const doc = makeDoc('<button style="outline: none;" aria-hidden="true">Hidden</button>');
    expect(focusVisible.run(doc)).toHaveLength(0);
  });
});
