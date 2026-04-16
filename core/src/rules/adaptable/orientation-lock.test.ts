import { describe, it, expect } from "vitest";
import { makeDoc } from "../../test-helpers";
import { orientationLock } from "./orientation-lock";

describe("adaptable/orientation-lock", () => {
  it("passes without style elements", () => {
    const doc = makeDoc("<html><head></head><body></body></html>");
    expect(orientationLock.run(doc)).toHaveLength(0);
  });

  it("passes with non-orientation media query", () => {
    const doc = makeDoc(`<html><head><style>
      @media (max-width: 768px) { .container { width: 100%; } }
    </style></head><body></body></html>`);
    expect(orientationLock.run(doc)).toHaveLength(0);
  });

  it("passes with orientation query but no rotation", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .container { width: 100%; } }
    </style></head><body></body></html>`);
    expect(orientationLock.run(doc)).toHaveLength(0);
  });

  it("reports 90deg rotation in portrait media query", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .page { transform: rotate(90deg); } }
    </style></head><body></body></html>`);
    const violations = orientationLock.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("adaptable/orientation-lock");
    expect(violations[0].message).toContain("portrait");
  });

  it("reports 270deg rotation in landscape media query", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: landscape) { .page { transform: rotate(270deg); } }
    </style></head><body></body></html>`);
    const violations = orientationLock.run(doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("landscape");
  });

  it("reports rotateZ(90deg)", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .page { transform: rotateZ(90deg); } }
    </style></head><body></body></html>`);
    const violations = orientationLock.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("passes with small rotation angle (45deg)", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .page { transform: rotate(45deg); } }
    </style></head><body></body></html>`);
    expect(orientationLock.run(doc)).toHaveLength(0);
  });

  it("reports matrix-based 90deg rotation", () => {
    // matrix for 90deg: matrix(0, 1, -1, 0, 0, 0)
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .page { transform: matrix(0, 1, -1, 0, 0, 0); } }
    </style></head><body></body></html>`);
    const violations = orientationLock.run(doc);
    expect(violations).toHaveLength(1);
  });

  it("reports standalone rotate CSS property", () => {
    const doc = makeDoc(`<html><head><style>
      @media (orientation: portrait) { .page { rotate: 90deg; } }
    </style></head><body></body></html>`);
    const violations = orientationLock.run(doc);
    expect(violations).toHaveLength(1);
  });
});
