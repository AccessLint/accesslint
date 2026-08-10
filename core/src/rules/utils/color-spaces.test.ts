import { describe, it, expect } from "vitest";
import { parseColorFunction } from "./color-spaces";
import { parseColor, parseColorAlpha } from "./color";

/**
 * Expected values are Chrome's own output, captured by painting each color to
 * a canvas and reading the pixel back. color-spaces.browser.test.ts re-checks
 * them against the live browser.
 */
describe("parseColorFunction", () => {
  describe("oklch", () => {
    it.each([
      ["oklch(0.5 0.1 250)", [50, 102, 154]],
      ["oklch(0.2 0.03 280)", [19, 20, 35]],
      ["oklch(0.95 0.01 250)", [234, 239, 245]],
      ["oklch(0 0 0)", [0, 0, 0]],
      ["oklch(1 0 0)", [255, 255, 255]],
    ])("converts %s", (input, expected) => {
      expect(parseColorFunction(input as string)!.rgb).toEqual(expected);
    });

    it("accepts a percentage lightness", () => {
      expect(parseColorFunction("oklch(50% 0.1 250)")!.rgb).toEqual(
        parseColorFunction("oklch(0.5 0.1 250)")!.rgb,
      );
    });

    it("accepts a percentage chroma against the 0.4 reference range", () => {
      expect(parseColorFunction("oklch(0.6 40% 120)")!.rgb).toEqual([117, 140, 0]);
    });

    it.each([
      ["oklch(0.5 0.1 180deg)", "oklch(0.5 0.1 180)"],
      ["oklch(0.5 0.1 0.5turn)", "oklch(0.5 0.1 180)"],
      ["oklch(0.5 0.1 200grad)", "oklch(0.5 0.1 180)"],
    ])("treats %s as %s", (input, equivalent) => {
      expect(parseColorFunction(input)!.rgb).toEqual(parseColorFunction(equivalent)!.rgb);
    });

    it("treats `none` as zero", () => {
      expect(parseColorFunction("oklch(0.5 none 250)")!.rgb).toEqual([99, 99, 99]);
    });

    it("clamps out-of-gamut channels into sRGB", () => {
      expect(parseColorFunction("oklch(0.7 0.2 30)")!.rgb).toEqual([255, 97, 77]);
    });
  });

  describe("oklab", () => {
    it.each([
      ["oklab(0.5 -0.1 0.05)", [32, 117, 68]],
      ["oklab(0.539974 0.0962086 -0.0928316)", [140, 83, 162]],
    ])("converts %s", (input, expected) => {
      expect(parseColorFunction(input as string)!.rgb).toEqual(expected);
    });
  });

  describe("lab and lch (D50)", () => {
    it.each([
      ["lab(50 40 30)", [187, 88, 70]],
      ["lab(100 0 0)", [255, 255, 255]],
      ["lab(50% 40 30)", [187, 88, 70]],
      ["lch(50 40 30)", [178, 93, 87]],
      ["lch(80 60 180)", [0, 227, 196]],
    ])("converts %s", (input, expected) => {
      expect(parseColorFunction(input as string)!.rgb).toEqual(expected);
    });
  });

  describe("color()", () => {
    it.each([
      ["color(srgb 0.5 0 0.5)", [128, 0, 128]],
      ["color(srgb 1 1 1)", [255, 255, 255]],
      ["color(srgb-linear 0.5 0.5 0.5)", [188, 188, 188]],
      ["color(display-p3 0.3 0.4 0.5)", [69, 103, 130]],
      ["color(display-p3 1 0 0)", [255, 0, 0]],
      ["color(xyz 0.2 0.3 0.4)", [0, 167, 164]],
      ["color(xyz-d65 0.2 0.3 0.4)", [0, 167, 164]],
      ["color(xyz-d50 0.2 0.3 0.4)", [0, 168, 189]],
    ])("converts %s", (input, expected) => {
      expect(parseColorFunction(input as string)!.rgb).toEqual(expected);
    });

    it("returns null for color spaces it cannot convert", () => {
      expect(parseColorFunction("color(rec2020 0.2 0.3 0.4)")).toBeNull();
      expect(parseColorFunction("color(prophoto-rgb 0.2 0.3 0.4)")).toBeNull();
    });
  });

  describe("alpha", () => {
    it.each([
      ["oklch(0.5 0.1 250 / 0.5)", 0.5],
      ["oklch(0.5 0.1 250 / 50%)", 0.5],
      ["color(srgb 0.5 0 0.5 / 0.4)", 0.4],
      ["oklch(0.5 0.1 250)", 1],
      ["oklch(0.5 0.1 250 / none)", 1],
    ])("reads alpha from %s", (input, expected) => {
      expect(parseColorFunction(input as string)!.alpha).toBe(expected);
    });

    it("does not let alpha change the resolved rgb", () => {
      expect(parseColorFunction("oklch(0.5 0.1 250 / 0.5)")!.rgb).toEqual(
        parseColorFunction("oklch(0.5 0.1 250)")!.rgb,
      );
    });
  });

  describe("non-matching input", () => {
    it.each([
      "rgb(1, 2, 3)",
      "#abcdef",
      "red",
      "transparent",
      "",
      "oklch()",
      "oklch(0.5 0.1)",
      "not-a-color(1 2 3)",
    ])("returns null for %s", (input) => {
      expect(parseColorFunction(input)).toBeNull();
    });
  });
});

describe("parseColor integration", () => {
  it("resolves modern color functions", () => {
    expect(parseColor("oklch(0.2 0.03 280)")).toEqual([19, 20, 35]);
    expect(parseColor("color(display-p3 1 0 0)")).toEqual([255, 0, 0]);
    expect(parseColor("lab(50 40 30)")).toEqual([187, 88, 70]);
  });

  it("is case-insensitive", () => {
    expect(parseColor("OKLCH(0.2 0.03 280)")).toEqual([19, 20, 35]);
  });

  it("still resolves the legacy formats", () => {
    expect(parseColor("rgb(19, 19, 39)")).toEqual([19, 19, 39]);
    expect(parseColor("#131327")).toEqual([19, 19, 39]);
    expect(parseColor("white")).toEqual([255, 255, 255]);
  });

  it("still returns null for genuinely unparseable values", () => {
    expect(parseColor("not-a-color")).toBeNull();
    expect(parseColor("color(rec2020 0.2 0.3 0.4)")).toBeNull();
  });
});

describe("parseColorAlpha integration", () => {
  it("reads alpha from modern color functions", () => {
    expect(parseColorAlpha("oklch(0.5 0.1 250 / 0.5)")).toBe(0.5);
    expect(parseColorAlpha("color(srgb 0.5 0 0.5 / 40%)")).toBe(0.4);
  });

  it("defaults to opaque", () => {
    expect(parseColorAlpha("oklch(0.5 0.1 250)")).toBe(1);
    expect(parseColorAlpha("rgb(1, 2, 3)")).toBe(1);
  });

  it("still reads legacy alpha", () => {
    expect(parseColorAlpha("rgba(0, 0, 0, 0.25)")).toBe(0.25);
    expect(parseColorAlpha("rgb(0 0 0 / 50%)")).toBe(0.5);
  });
});
