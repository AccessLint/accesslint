import { describe, it, expect, afterEach } from "vitest";
import { isGeneratedId, isStableId } from "./generated-id";
import { getSelector, extractAnchor, clearSelectorCache } from "./selector";
import { makeDoc } from "../../test-helpers";

afterEach(() => clearSelectorCache());

describe("isGeneratedId", () => {
  it("flags framework-generated ids", () => {
    const generated = [
      ":r0:",
      ":r1a:",
      ":R7:",
      "«1»",
      "mui-123",
      "css-1ab2c3",
      "radix-:r3:",
      "headlessui-menu-1",
      "a1b2c3d4",
      "field-9f3a1c",
    ];
    for (const id of generated) expect(isGeneratedId(id), id).toBe(true);
  });

  it("keeps authored ids", () => {
    const authored = ["submit", "email-field", "main-nav", "user_profile", "step1"];
    for (const id of authored) expect(isGeneratedId(id), id).toBe(false);
  });
});

describe("isStableId", () => {
  it("accepts authored ids, rejects generated/empty/oversized/missing", () => {
    expect(isStableId("submit")).toBe(true);
    expect(isStableId(":r1:")).toBe(false);
    expect(isStableId("")).toBe(false);
    expect(isStableId(null)).toBe(false);
    expect(isStableId(undefined)).toBe(false);
    expect(isStableId("x".repeat(150))).toBe(false);
  });
});

describe("selector hardening", () => {
  it("getSelector ignores a generated target id", () => {
    const doc = makeDoc(`<main><section><div id=":r7:"><span>y</span></div></section></main>`);
    const div = doc.querySelector("section")!.firstElementChild!;
    expect(getSelector(div)).not.toContain(":r7:");
  });

  it("getSelector still uses an authored id", () => {
    const doc = makeDoc(`<main><div id="hero"><span>y</span></div></main>`);
    const div = doc.querySelector("#hero")!;
    expect(getSelector(div)).toBe("#hero");
  });

  it("extractAnchor skips a generated id and falls through to other anchors", () => {
    const doc = makeDoc(`<button id=":r3:" name="save">x</button>`);
    const btn = doc.querySelector("button")!;
    expect(extractAnchor(btn)).toBe("name=save");
  });
});
