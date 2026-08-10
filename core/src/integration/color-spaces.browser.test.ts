import { describe, it, expect } from "vitest";
import { parseColorFunction } from "../rules/utils/color-spaces";

/**
 * Ground truth: paint the color with Chrome's own pipeline and read the sRGB
 * pixel back. Guards the conversion matrices against drift far better than
 * hand-copied expected values.
 */
function browserRgb(value: string): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" })!;
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

const CASES = [
  "oklch(0.5 0.1 250)",
  "oklch(0.2 0.03 280)",
  "oklch(0.95 0.01 250)",
  "oklch(0.7 0.2 30)",
  "oklch(0 0 0)",
  "oklch(1 0 0)",
  "oklch(50% 0.1 250)",
  "oklch(0.6 40% 120)",
  "oklch(0.5 0.1 0.5turn)",
  "oklch(0.5 none 250)",
  "oklab(0.5 -0.1 0.05)",
  "oklab(0.539974 0.0962086 -0.0928316)",
  "lab(50 40 30)",
  "lab(100 0 0)",
  "lab(50% 40 30)",
  "lch(50 40 30)",
  "lch(80 60 180)",
  "color(srgb 0.5 0 0.5)",
  "color(srgb 1 1 1)",
  "color(srgb-linear 0.5 0.5 0.5)",
  "color(display-p3 0.3 0.4 0.5)",
  "color(display-p3 1 0 0)",
  "color(xyz 0.2 0.3 0.4)",
  "color(xyz-d50 0.2 0.3 0.4)",
];

describe("color-spaces conversion matches the browser", () => {
  for (const value of CASES) {
    it(`converts ${value}`, () => {
      const parsed = parseColorFunction(value);
      expect(parsed, `${value} should parse`).not.toBeNull();
      expect(parsed!.rgb).toEqual(browserRgb(value));
    });
  }

  it("leaves out-of-gamut colors clamped the way the browser clamps them", () => {
    // oklch(0.7 0.2 30) is outside sRGB; red clips to 255.
    expect(parseColorFunction("oklch(0.7 0.2 30)")!.rgb).toEqual(browserRgb("oklch(0.7 0.2 30)"));
  });
});
