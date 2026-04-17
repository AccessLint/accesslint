import type { Rule } from "../types";
import { getSelector, getHtmlSnippet } from "../utils/selector";

/**
 * Convert an angle value to degrees.
 */
function toDegrees(num: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "deg":
      return num;
    case "rad":
      return (num * 180) / Math.PI;
    case "turn":
      return num * 360;
    case "grad":
      return num * 0.9;
    default:
      return NaN;
  }
}

/**
 * Normalize degrees to 0–360 and check if close to 90° or 270° (±5°).
 */
function isLockedAngle(degrees: number): boolean {
  if (isNaN(degrees)) return false;
  degrees = ((degrees % 360) + 360) % 360;
  return (degrees >= 85 && degrees <= 95) || (degrees >= 265 && degrees <= 275);
}

/**
 * Check if a CSS transform value rotates close to 90 or 270 degrees (±5°),
 * which would lock the orientation.
 */
function isOrientationLockTransform(value: string): boolean {
  // rotate(Xdeg) or rotateZ(Xdeg)
  const rotateMatch = value.match(/rotate[Z]?\(\s*(-?[\d.]+)(deg|rad|turn|grad)\s*\)/i);
  if (rotateMatch) {
    const degrees = toDegrees(parseFloat(rotateMatch[1]), rotateMatch[2]);
    if (isLockedAngle(degrees)) return true;
  }

  // matrix(a, b, c, d, tx, ty) — 2D transform matrix
  // For rotation θ: matrix(cos θ, sin θ, -sin θ, cos θ, 0, 0)
  const matrixMatch = value.match(
    /matrix\(\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)/i,
  );
  if (matrixMatch) {
    const a = parseFloat(matrixMatch[1]);
    const b = parseFloat(matrixMatch[2]);
    const degrees = Math.atan2(b, a) * (180 / Math.PI);
    if (isLockedAngle(degrees)) return true;
  }

  // matrix3d — 4x4 transform matrix (column-major)
  // For rotation θ around Z: matrix3d(cos θ, sin θ, 0, 0, -sin θ, cos θ, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
  const matrix3dMatch = value.match(
    /matrix3d\(\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)\s*,\s*(-?[\d.e]+)/i,
  );
  if (matrix3dMatch) {
    const m00 = parseFloat(matrix3dMatch[1]);
    const m10 = parseFloat(matrix3dMatch[2]);
    const degrees = Math.atan2(m10, m00) * (180 / Math.PI);
    if (isLockedAngle(degrees)) return true;
  }

  return false;
}

/**
 * Check if a standalone rotate property value represents an orientation lock.
 */
function isOrientationLockRotate(value: string): boolean {
  const match = value.match(/(-?[\d.]+)(deg|rad|turn|grad)/i);
  if (!match) return false;
  const degrees = toDegrees(parseFloat(match[1]), match[2]);
  return isLockedAngle(degrees);
}

export const orientationLock: Rule = {
  id: "adaptable/orientation-lock",
  category: "adaptable",
  actRuleIds: ["b33eff"],
  wcag: ["1.3.4"],
  level: "AA",
  tags: ["page-level"],
  fixability: "contextual",
  description: "Page orientation must not be restricted using CSS transforms.",
  guidance:
    "Users with motor disabilities may mount their device in a fixed orientation. Using CSS transforms with @media (orientation: portrait/landscape) to rotate content 90° effectively locks the page to one orientation. Remove the orientation-dependent transform and use responsive design instead.",
  run(doc) {
    const violations = [];

    // Check <style> elements for @media orientation queries with transforms
    for (const style of doc.querySelectorAll("style")) {
      const css = style.textContent || "";

      // Find @media blocks with orientation queries
      const mediaRegex =
        /@media[^{]*\b(orientation)\s*:\s*(portrait|landscape)\b[^{]*\{([^}]*\{[^}]*\}[^}]*)\}/gi;
      let match: RegExpExecArray | null;

      while ((match = mediaRegex.exec(css))) {
        const mediaBody = match[3];
        let locked = false;

        // Check for transform property with rotation close to 90/270 degrees
        const transformMatch = mediaBody.match(/transform\s*:\s*([^;]+)/i);
        if (transformMatch && isOrientationLockTransform(transformMatch[1])) {
          locked = true;
        }

        // Check for standalone rotate CSS property
        if (!locked) {
          const rotateMatch = mediaBody.match(/(?:^|[{;\s])rotate\s*:\s*([^;]+)/i);
          if (rotateMatch && isOrientationLockRotate(rotateMatch[1])) {
            locked = true;
          }
        }

        if (locked) {
          violations.push({
            ruleId: "adaptable/orientation-lock",
            selector: getSelector(style),
            html: getHtmlSnippet(style),
            impact: "serious" as const,
            message: `CSS locks page orientation via @media (orientation: ${match[2]}) with a 90° transform.`,
          });
        }
      }
    }

    return violations;
  },
};
