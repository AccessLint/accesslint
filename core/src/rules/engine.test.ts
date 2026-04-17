import { describe, it, expect } from "vitest";
import { makeDoc } from "../test-helpers";
import { compileDeclarativeRule, validateDeclarativeRule } from "./engine";
import type { DeclarativeRule } from "./types";

function baseRule(overrides: Partial<DeclarativeRule>): DeclarativeRule {
  return {
    id: "test-rule",
    selector: "div",
    check: { type: "selector-exists" },
    impact: "serious",
    message: "Test violation",
    description: "Test rule",
    wcag: ["1.1.1"],
    level: "A",
    ...overrides,
  };
}

describe("validateDeclarativeRule", () => {
  it("returns null for a valid rule", () => {
    expect(validateDeclarativeRule(baseRule({}))).toBeNull();
  });

  it("rejects non-object", () => {
    expect(validateDeclarativeRule("string")).toBe("Rule spec must be an object");
  });

  it("rejects missing id", () => {
    expect(validateDeclarativeRule({ ...baseRule({}), id: "" })).toBe(
      "Rule must have a non-empty string id",
    );
  });

  it("rejects missing selector", () => {
    expect(validateDeclarativeRule({ ...baseRule({}), selector: "" })).toBe(
      "Rule must have a non-empty string selector",
    );
  });

  it("rejects invalid check type", () => {
    expect(validateDeclarativeRule({ ...baseRule({}), check: { type: "invalid" } })).toBe(
      "Invalid check type: invalid",
    );
  });

  it("rejects invalid impact", () => {
    expect(validateDeclarativeRule({ ...baseRule({}), impact: "high" })).toBe(
      "Rule must have a valid impact (critical|serious|moderate|minor)",
    );
  });

  it("rejects missing message", () => {
    expect(validateDeclarativeRule({ ...baseRule({}), message: "" })).toBe(
      "Rule must have a non-empty message",
    );
  });

  it("validates attribute-value check requires attribute", () => {
    expect(
      validateDeclarativeRule({
        ...baseRule({}),
        check: { type: "attribute-value", operator: ">", value: 0 },
      }),
    ).toBe("attribute-value check requires attribute string");
  });

  it("validates attribute-regex check requires shouldMatch", () => {
    expect(
      validateDeclarativeRule({
        ...baseRule({}),
        check: { type: "attribute-regex", attribute: "lang", pattern: "^[a-z]" },
      }),
    ).toBe("attribute-regex check requires shouldMatch boolean");
  });

  it("validates child-required check requires childSelector", () => {
    expect(
      validateDeclarativeRule({
        ...baseRule({}),
        check: { type: "child-required" },
      }),
    ).toBe("child-required check requires childSelector string");
  });

  it("validates child-invalid check requires allowedChildren", () => {
    expect(
      validateDeclarativeRule({
        ...baseRule({}),
        check: { type: "child-invalid" },
      }),
    ).toBe("child-invalid check requires allowedChildren array");
  });
});

describe("compileDeclarativeRule — selector-exists", () => {
  it("reports elements matching the selector", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "no-blink",
        selector: "blink",
        check: { type: "selector-exists" },
        message: "Do not use <blink>",
      }),
    );
    const doc = makeDoc("<html><body><blink>Hi</blink></body></html>");
    const v = rule.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].ruleId).toBe("no-blink");
    expect(v[0].message).toBe("Do not use <blink>");
  });

  it("reports no violations when no elements match", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "blink",
        check: { type: "selector-exists" },
      }),
    );
    const doc = makeDoc("<html><body><p>Normal</p></body></html>");
    expect(rule.run(doc)).toHaveLength(0);
  });

  it("skips aria-hidden elements by default", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "blink",
        check: { type: "selector-exists" },
      }),
    );
    const doc = makeDoc('<html><body><blink aria-hidden="true">Hidden</blink></body></html>');
    expect(rule.run(doc)).toHaveLength(0);
  });

  it("does not skip aria-hidden when skipAriaHidden is false", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "blink",
        check: { type: "selector-exists" },
        skipAriaHidden: false,
      }),
    );
    const doc = makeDoc('<html><body><blink aria-hidden="true">Hidden</blink></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });
});

describe("compileDeclarativeRule — attribute-value", () => {
  it("detects tabindex > 0", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "tabindex-check",
        selector: "[tabindex]",
        check: { type: "attribute-value", attribute: "tabindex", operator: ">", value: 0 },
        message: 'Element has tabindex="{{value}}"',
      }),
    );
    const doc = makeDoc('<html><body><div tabindex="5">Hi</div></body></html>');
    const v = rule.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toBe('Element has tabindex="5"');
  });

  it("passes when tabindex is 0", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[tabindex]",
        check: { type: "attribute-value", attribute: "tabindex", operator: ">", value: 0 },
      }),
    );
    const doc = makeDoc('<html><body><div tabindex="0">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(0);
  });

  it("detects = operator", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[data-test]",
        check: { type: "attribute-value", attribute: "data-test", operator: "=", value: "bad" },
      }),
    );
    const doc = makeDoc('<html><body><div data-test="bad">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("detects != operator", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[data-test]",
        check: { type: "attribute-value", attribute: "data-test", operator: "!=", value: "good" },
      }),
    );
    const doc = makeDoc('<html><body><div data-test="bad">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("detects in operator", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[role]",
        check: {
          type: "attribute-value",
          attribute: "role",
          operator: "in",
          value: ["invalid", "bad"],
        },
      }),
    );
    const doc = makeDoc('<html><body><div role="invalid">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("detects not-in operator", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[role]",
        check: {
          type: "attribute-value",
          attribute: "role",
          operator: "not-in",
          value: ["button", "link"],
        },
      }),
    );
    const doc = makeDoc('<html><body><div role="invalid">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("skips elements without the attribute", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "div",
        check: { type: "attribute-value", attribute: "tabindex", operator: ">", value: 0 },
      }),
    );
    const doc = makeDoc("<html><body><div>No tabindex</div></body></html>");
    expect(rule.run(doc)).toHaveLength(0);
  });
});

describe("compileDeclarativeRule — attribute-missing", () => {
  it("detects missing lang on html", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "readable/html-has-lang",
        selector: "html",
        check: { type: "attribute-missing", attribute: "lang" },
        message: "<html> must have a lang attribute",
      }),
    );
    const doc = makeDoc("<html><body><p>Hello</p></body></html>");
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("passes when attribute is present", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "html",
        check: { type: "attribute-missing", attribute: "lang" },
      }),
    );
    const doc = makeDoc('<html lang="en"><body><p>Hello</p></body></html>');
    expect(rule.run(doc)).toHaveLength(0);
  });
});

describe("compileDeclarativeRule — attribute-regex", () => {
  it("detects lang value not matching valid pattern", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "lang-valid",
        selector: "html[lang]",
        check: {
          type: "attribute-regex",
          attribute: "lang",
          pattern: "^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$",
          shouldMatch: true,
        },
        message: 'Invalid lang value "{{value}}"',
      }),
    );
    const doc = makeDoc('<html lang="123"><body><p>Hello</p></body></html>');
    const v = rule.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toBe('Invalid lang value "123"');
  });

  it("passes when lang matches pattern", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "html[lang]",
        check: {
          type: "attribute-regex",
          attribute: "lang",
          pattern: "^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$",
          shouldMatch: true,
        },
      }),
    );
    const doc = makeDoc('<html lang="en-US"><body><p>Hello</p></body></html>');
    expect(rule.run(doc)).toHaveLength(0);
  });

  it("detects attribute matching pattern when shouldMatch is false", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[data-test]",
        check: {
          type: "attribute-regex",
          attribute: "data-test",
          pattern: "^bad",
          shouldMatch: false,
        },
        message: "Bad value detected",
      }),
    );
    const doc = makeDoc('<html><body><div data-test="bad-value">Hi</div></body></html>');
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("skips elements without the attribute", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "html",
        check: { type: "attribute-regex", attribute: "lang", pattern: "^[a-z]", shouldMatch: true },
      }),
    );
    const doc = makeDoc("<html><body><p>Hello</p></body></html>");
    expect(rule.run(doc)).toHaveLength(0);
  });
});

describe("compileDeclarativeRule — child-required", () => {
  it("detects missing required child", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "video-captions",
        selector: "video",
        check: { type: "child-required", childSelector: "track[kind='captions']" },
        message: "Video must have captions track",
      }),
    );
    const doc = makeDoc("<html><body><video src='test.mp4'></video></body></html>");
    expect(rule.run(doc)).toHaveLength(1);
  });

  it("passes when required child exists", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "video",
        check: { type: "child-required", childSelector: "track[kind='captions']" },
      }),
    );
    const doc = makeDoc(
      "<html><body><video><track kind='captions' src='cc.vtt'></video></body></html>",
    );
    expect(rule.run(doc)).toHaveLength(0);
  });
});

describe("compileDeclarativeRule — child-invalid", () => {
  it("detects invalid children in a list", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "list-check",
        selector: "ul, ol",
        check: { type: "child-invalid", allowedChildren: ["li", "script", "template"] },
        message: "List contains invalid child <{{tag}}>",
      }),
    );
    const doc = makeDoc("<html><body><ul><div>Invalid</div><li>Valid</li></ul></body></html>");
    const v = rule.run(doc);
    expect(v).toHaveLength(1);
    expect(v[0].message).toBe("List contains invalid child <div>");
  });

  it("passes when all children are valid", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "ul",
        check: { type: "child-invalid", allowedChildren: ["li", "script", "template"] },
      }),
    );
    const doc = makeDoc("<html><body><ul><li>One</li><li>Two</li></ul></body></html>");
    expect(rule.run(doc)).toHaveLength(0);
  });

  it("reports only one violation per parent", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "ul",
        check: { type: "child-invalid", allowedChildren: ["li"] },
      }),
    );
    const doc = makeDoc("<html><body><ul><div>A</div><span>B</span></ul></body></html>");
    expect(rule.run(doc)).toHaveLength(1);
  });
});

describe("compileDeclarativeRule — message templates", () => {
  it("substitutes {{tag}} in messages", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "marquee, blink",
        check: { type: "selector-exists" },
        message: "Do not use <{{tag}}> element",
      }),
    );
    const doc = makeDoc("<html><body><marquee>Scroll</marquee></body></html>");
    const v = rule.run(doc);
    expect(v[0].message).toBe("Do not use <marquee> element");
  });

  it("substitutes {{value}} in messages", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        selector: "[tabindex]",
        check: { type: "attribute-value", attribute: "tabindex", operator: ">", value: 0 },
        message: 'tabindex="{{value}}" is too high',
      }),
    );
    const doc = makeDoc('<html><body><div tabindex="3">X</div></body></html>');
    const v = rule.run(doc);
    expect(v[0].message).toBe('tabindex="3" is too high');
  });
});

describe("compileDeclarativeRule — rule metadata", () => {
  it("preserves metadata fields on compiled rule", () => {
    const rule = compileDeclarativeRule(
      baseRule({
        id: "test-meta",
        description: "Test desc",
        guidance: "Test guidance",
        wcag: ["1.1.1", "4.1.2"],
        level: "AA",
        tags: ["best-practice"],
      }),
    );
    expect(rule.id).toBe("test-meta");
    expect(rule.description).toBe("Test desc");
    expect(rule.guidance).toBe("Test guidance");
    expect(rule.wcag).toEqual(["1.1.1", "4.1.2"]);
    expect(rule.level).toBe("AA");
    expect(rule.tags).toEqual(["best-practice"]);
  });
});
