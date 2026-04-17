import { describe, it } from "vitest";
import { expectViolations, expectNoViolations } from "../../test-helpers";
import { orientationLock } from "./orientation-lock";

const RULE_ID = "adaptable/orientation-lock";

describe(RULE_ID, () => {
  it("passes without style elements", () => {
    expectNoViolations(orientationLock, "<html><head></head><body></body></html>");
  });

  it("passes with non-orientation media query", () => {
    expectNoViolations(
      orientationLock,
      `<html><head><style>
      @media (max-width: 768px) { .container { width: 100%; } }
    </style></head><body></body></html>`,
    );
  });

  it("passes with orientation query but no rotation", () => {
    expectNoViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .container { width: 100%; } }
    </style></head><body></body></html>`,
    );
  });

  it("reports 90deg rotation in portrait media query", () => {
    expectViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .page { transform: rotate(90deg); } }
    </style></head><body></body></html>`,
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /portrait/,
      },
    );
  });

  it("reports 270deg rotation in landscape media query", () => {
    expectViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: landscape) { .page { transform: rotate(270deg); } }
    </style></head><body></body></html>`,
      {
        count: 1,
        ruleId: RULE_ID,
        messageMatches: /landscape/,
      },
    );
  });

  it("reports rotateZ(90deg)", () => {
    expectViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .page { transform: rotateZ(90deg); } }
    </style></head><body></body></html>`,
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("passes with small rotation angle (45deg)", () => {
    expectNoViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .page { transform: rotate(45deg); } }
    </style></head><body></body></html>`,
    );
  });

  it("reports matrix-based 90deg rotation", () => {
    // matrix for 90deg: matrix(0, 1, -1, 0, 0, 0)
    expectViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .page { transform: matrix(0, 1, -1, 0, 0, 0); } }
    </style></head><body></body></html>`,
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });

  it("reports standalone rotate CSS property", () => {
    expectViolations(
      orientationLock,
      `<html><head><style>
      @media (orientation: portrait) { .page { rotate: 90deg; } }
    </style></head><body></body></html>`,
      {
        count: 1,
        ruleId: RULE_ID,
      },
    );
  });
});
