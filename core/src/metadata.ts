import packageJson from "../package.json";
import type { TestEngine, TestEnvironment } from "./rules/types";

/** The @accesslint/core engine version, mirroring `axe.version`. */
export const version: string = packageJson.version;

export interface TestMetadata {
  testEngine: TestEngine;
  testEnvironment: TestEnvironment;
}

function read<T>(getter: () => T, fallback: T): T {
  try {
    return getter();
  } catch {
    return fallback;
  }
}

function readString(getter: () => unknown, fallback: string): string {
  const value = read(getter, fallback);
  return typeof value === "string" ? value : fallback;
}

function readFiniteNumber(getter: () => unknown): number {
  const value = read(getter, 0);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getTestMetadata(doc: Document): TestMetadata {
  const view = read(() => doc.defaultView, null);

  return {
    testEngine: { name: "accesslint", version: packageJson.version },
    testEnvironment: {
      userAgent: readString(() => view?.navigator?.userAgent, ""),
      windowWidth: readFiniteNumber(() => view?.innerWidth),
      windowHeight: readFiniteNumber(() => view?.innerHeight),
      orientationAngle: readFiniteNumber(() => view?.screen?.orientation?.angle),
      orientationType: readString(() => view?.screen?.orientation?.type, "portrait-primary"),
    },
  };
}
