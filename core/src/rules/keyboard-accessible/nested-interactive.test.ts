import { describe, it, expect } from "vitest";
import { makeDoc, expectViolations, expectNoViolations } from "../../test-helpers";
import { nestedInteractive } from "./nested-interactive";

const RULE_ID = "keyboard-accessible/nested-interactive";

describe(RULE_ID, () => {
  it("reports button inside link", () => {
    expectViolations(nestedInteractive, '<a href="/page"><button>Click</button></a>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /button.*inside|inside.*button/,
    });
  });

  it("reports link inside button", () => {
    expectViolations(nestedInteractive, '<button><a href="/page">Link</a></button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports input inside link", () => {
    expectViolations(nestedInteractive, '<a href="/page"><input type="text"></a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes non-nested interactive elements", () => {
    expectNoViolations(nestedInteractive, '<button>One</button><a href="/">Two</a>');
  });

  it("passes link without href (not interactive)", () => {
    expectNoViolations(nestedInteractive, "<button><a>Not a link</a></button>");
  });

  it("reports elements with interactive roles", () => {
    expectViolations(nestedInteractive, '<a href="/"><span role="button">Nested</span></a>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("reports elements with tabindex", () => {
    expectViolations(nestedInteractive, '<button><span tabindex="0">Focusable</span></button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });

  it("passes tabindex=-1 (not in tab order)", () => {
    expectNoViolations(nestedInteractive, '<button><span tabindex="-1">Not in tab order</span></button>');
  });

  it("skips disabled elements", () => {
    expectNoViolations(nestedInteractive, '<a href="/"><button disabled>Disabled</button></a>');
  });

  it("skips aria-hidden elements", () => {
    expectNoViolations(nestedInteractive, '<a href="/"><button aria-hidden="true">Hidden</button></a>');
  });

  // --- Native composite widgets: child elements belong inside their parent ---

  it("passes option inside select", () => {
    expectNoViolations(nestedInteractive, '<select><option>A</option><option>B</option></select>');
  });

  it("passes optgroup with options inside select", () => {
    expectNoViolations(nestedInteractive, '<select><optgroup label="Group"><option>A</option></optgroup></select>');
  });

  it("passes summary inside details", () => {
    expectNoViolations(nestedInteractive, "<details><summary>Toggle</summary><p>Content</p></details>");
  });

  // --- ARIA composite widgets: child roles belong inside their parent ---

  it("passes role=option inside role=listbox", () => {
    expectNoViolations(
      nestedInteractive,
      '<div role="listbox"><div role="option">A</div><div role="option">B</div></div>',
    );
  });

  it("passes role=menuitem inside role=menu", () => {
    expectNoViolations(
      nestedInteractive,
      '<div role="menu"><div role="menuitem">Cut</div><div role="menuitem">Copy</div></div>',
    );
  });

  it("passes role=tab inside role=tablist", () => {
    expectNoViolations(
      nestedInteractive,
      '<div role="tablist"><button role="tab">Tab 1</button><button role="tab">Tab 2</button></div>',
    );
  });

  it("passes role=treeitem inside role=tree", () => {
    expectNoViolations(
      nestedInteractive,
      '<div role="tree"><div role="treeitem" tabindex="0">Node</div></div>',
    );
  });

  // --- True violations: interactive controls wrongly nested ---

  it("reports button inside another button", () => {
    // HTML parsers auto-close <button> before a nested <button>, so we
    // construct the invalid nesting via DOM APIs to test the rule logic.
    const doc = makeDoc("<button>Outer</button>");
    const outer = doc.querySelector("button")!;
    const inner = doc.createElement("button");
    inner.textContent = "Inner";
    outer.appendChild(inner);
    const violations = nestedInteractive.run(doc);
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });

  it("reports select inside a link", () => {
    expectViolations(nestedInteractive, '<a href="/"><select><option>A</option></select></a>', {
      count: 1,
      ruleId: RULE_ID,
      messageMatches: /select/,
    });
  });

  it("reports contenteditable inside button", () => {
    expectViolations(nestedInteractive, '<button><span contenteditable="true">Edit</span></button>', {
      count: 1,
      ruleId: RULE_ID,
    });
  });
});
