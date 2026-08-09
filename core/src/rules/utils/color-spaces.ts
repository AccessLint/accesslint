/**
 * CSS Color 4 color functions, converted to sRGB.
 *
 * Chromium resolves hsl() and hwb() to rgb() in computed styles but leaves
 * oklch(), oklab(), lab(), lch(), and color() as authored, so contrast checks
 * have to resolve them. Percentage and `none` forms are handled too: DOM-only
 * runtimes echo the authored value back rather than normalizing it.
 */

type RGB = [number, number, number];
type Matrix = [RGB, RGB, RGB];

/** CSS uses a D50 white point for lab() and lch(). */
const D50_WHITE: RGB = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

const XYZ_D50_TO_LINEAR_SRGB: Matrix = [
  [3.13413596, -1.61738633, -0.490661946],
  [-0.978795503, 1.91625457, 0.0334427312],
  [0.0719553799, -0.228976826, 1.40538606],
];

const XYZ_D65_TO_LINEAR_SRGB: Matrix = [
  [3.24096994, -1.53738318, -0.49861076],
  [-0.969243636, 1.8759675, 0.0415550574],
  [0.0556300797, -0.203976959, 1.05697151],
];

const LINEAR_P3_TO_LINEAR_SRGB: Matrix = [
  [1.22494018, -0.224940176, 0],
  [-0.0420569548, 1.04205695, 0],
  [-0.0196375546, -0.0786360656, 1.09827362],
];

function apply(m: Matrix, [x, y, z]: RGB): RGB {
  return [
    m[0][0] * x + m[0][1] * y + m[0][2] * z,
    m[1][0] * x + m[1][1] * y + m[1][2] * z,
    m[2][0] * x + m[2][1] * y + m[2][2] * z,
  ];
}

/** sRGB transfer function, also used by display-p3. */
function encodeGamma(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.abs(c), 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

function decodeGamma(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toRgb(linear: RGB): RGB {
  return [encodeGamma(linear[0]), encodeGamma(linear[1]), encodeGamma(linear[2])];
}

function oklabToLinearSrgb(L: number, a: number, b: number): RGB {
  const l = (L + 0.396337777 * a + 0.215803757 * b) ** 3;
  const m = (L - 0.105561346 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.29148555 * b) ** 3;
  return [
    4.07674166 * l - 3.30771159 * m + 0.230969929 * s,
    -1.268438 * l + 2.6097574 * m - 0.341319396 * s,
    -0.0041960863 * l - 0.703418615 * m + 1.7076147 * s,
  ];
}

function labToXyzD50(L: number, a: number, b: number): RGB {
  const KAPPA = 24389 / 27;
  const EPSILON = 216 / 24389;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const x = fx ** 3 > EPSILON ? fx ** 3 : (116 * fx - 16) / KAPPA;
  const y = L > KAPPA * EPSILON ? fy ** 3 : L / KAPPA;
  const z = fz ** 3 > EPSILON ? fz ** 3 : (116 * fz - 16) / KAPPA;
  return [x * D50_WHITE[0], y * D50_WHITE[1], z * D50_WHITE[2]];
}

/** Resolve a channel token, mapping percentages onto the channel's range. */
function channel(token: string | undefined, percentRef: number): number | null {
  if (token === undefined) return null;
  if (token === "none") return 0;
  const value = parseFloat(token);
  if (Number.isNaN(value)) return null;
  return token.endsWith("%") ? (value / 100) * percentRef : value;
}

function hueDegrees(token: string | undefined): number | null {
  if (token === undefined) return null;
  if (token === "none") return 0;
  const value = parseFloat(token);
  if (Number.isNaN(value)) return null;
  if (token.endsWith("turn")) return value * 360;
  if (token.endsWith("grad")) return value * 0.9;
  if (token.endsWith("rad")) return (value * 180) / Math.PI;
  return value;
}

function alphaValue(token: string | null): number {
  if (token === null || token === "none") return 1;
  const value = parseFloat(token);
  if (Number.isNaN(value)) return 1;
  return Math.max(0, Math.min(1, token.endsWith("%") ? value / 100 : value));
}

function polarToRectangular(chroma: number, hue: number): [number, number] {
  const radians = (hue * Math.PI) / 180;
  return [chroma * Math.cos(radians), chroma * Math.sin(radians)];
}

function colorSpaceToRgb(space: string, c: RGB): RGB | null {
  switch (space) {
    case "srgb":
      return [
        Math.round(Math.max(0, Math.min(1, c[0])) * 255),
        Math.round(Math.max(0, Math.min(1, c[1])) * 255),
        Math.round(Math.max(0, Math.min(1, c[2])) * 255),
      ];
    case "srgb-linear":
      return toRgb(c);
    case "display-p3":
      return toRgb(
        apply(LINEAR_P3_TO_LINEAR_SRGB, [decodeGamma(c[0]), decodeGamma(c[1]), decodeGamma(c[2])]),
      );
    case "xyz":
    case "xyz-d65":
      return toRgb(apply(XYZ_D65_TO_LINEAR_SRGB, c));
    case "xyz-d50":
      return toRgb(apply(XYZ_D50_TO_LINEAR_SRGB, c));
    default:
      // a98-rgb, prophoto-rgb, rec2020 and any future space
      return null;
  }
}

export interface ParsedColorFunction {
  rgb: RGB;
  alpha: number;
}

/**
 * Parse oklch(), oklab(), lab(), lch(), or color() into sRGB.
 * Returns null for any other syntax, so callers can fall through.
 */
export function parseColorFunction(value: string): ParsedColorFunction | null {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(oklch|oklab|lch|lab|color)\((.*)\)$/s);
  if (!match) return null;

  const [main, alphaToken = null] = match[2].split("/");
  const tokens = main
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const alpha = alphaValue(alphaToken === null ? null : alphaToken.trim());

  let rgb: RGB | null = null;
  switch (match[1]) {
    case "oklab": {
      const L = channel(tokens[0], 1);
      const a = channel(tokens[1], 0.4);
      const b = channel(tokens[2], 0.4);
      if (L === null || a === null || b === null) return null;
      rgb = toRgb(oklabToLinearSrgb(L, a, b));
      break;
    }
    case "oklch": {
      const L = channel(tokens[0], 1);
      const c = channel(tokens[1], 0.4);
      const h = hueDegrees(tokens[2]);
      if (L === null || c === null || h === null) return null;
      const [a, b] = polarToRectangular(c, h);
      rgb = toRgb(oklabToLinearSrgb(L, a, b));
      break;
    }
    case "lab": {
      const L = channel(tokens[0], 100);
      const a = channel(tokens[1], 125);
      const b = channel(tokens[2], 125);
      if (L === null || a === null || b === null) return null;
      rgb = toRgb(apply(XYZ_D50_TO_LINEAR_SRGB, labToXyzD50(L, a, b)));
      break;
    }
    case "lch": {
      const L = channel(tokens[0], 100);
      const c = channel(tokens[1], 150);
      const h = hueDegrees(tokens[2]);
      if (L === null || c === null || h === null) return null;
      const [a, b] = polarToRectangular(c, h);
      rgb = toRgb(apply(XYZ_D50_TO_LINEAR_SRGB, labToXyzD50(L, a, b)));
      break;
    }
    case "color": {
      const c0 = channel(tokens[1], 1);
      const c1 = channel(tokens[2], 1);
      const c2 = channel(tokens[3], 1);
      if (c0 === null || c1 === null || c2 === null) return null;
      rgb = colorSpaceToRgb(tokens[0], [c0, c1, c2]);
      break;
    }
  }

  return rgb ? { rgb, alpha } : null;
}
