import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { presentationalChildrenFocusable } from "./presentational-children-focusable";

describe("aria/presentational-children-focusable", () => {
  it("reports focusable link inside role=option", () => {
    const doc = makeDoc('<li role="option"><a href="/page">Link</a></li>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(1);
  });

  it("reports focusable button inside role=tab", () => {
    const doc = makeDoc('<div role="tab"><button>Click</button></div>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(1);
  });

  it("skips link with tabindex=-1 inside role=option", () => {
    const doc = makeDoc('<li role="option"><a href="/page" tabindex="-1">Link</a></li>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(0);
  });

  it("skips disabled button inside role=tab", () => {
    const doc = makeDoc('<div role="tab"><button disabled>Click</button></div>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(0);
  });

  it("skips elements without children-presentational role", () => {
    const doc = makeDoc('<div role="group"><a href="/page">Link</a></div>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden subtrees", () => {
    const doc = makeDoc('<li role="option" aria-hidden="true"><a href="/page">Link</a></li>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(0);
  });

  it("reports input inside role=img", () => {
    const doc = makeDoc('<div role="img"><input type="text"></div>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(1);
  });

  it("skips input with tabindex=-1 inside role=img", () => {
    const doc = makeDoc('<div role="img"><input type="text" tabindex="-1"></div>');
    expect(presentationalChildrenFocusable.run(doc)).toHaveLength(0);
  });
});
