import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { getTestMetadata, version } from "./metadata";

describe("version", () => {
  it("exposes the engine version", () => {
    expect(version).toBe(packageJson.version);
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

const fallbackEnvironment = {
  userAgent: "",
  windowWidth: 0,
  windowHeight: 0,
  orientationAngle: 0,
  orientationType: "portrait-primary",
};

describe("getTestMetadata", () => {
  it("uses stable defaults when the document has no window", () => {
    const result = getTestMetadata({ defaultView: null } as Document);

    expect(result).toEqual({
      testEngine: { name: "accesslint", version: packageJson.version },
      testEnvironment: fallbackEnvironment,
    });
  });

  it("isolates throwing host getters and preserves readable values", () => {
    const view = {
      get navigator() {
        throw new Error("navigator unavailable");
      },
      innerWidth: 800,
      innerHeight: 600,
      screen: {
        orientation: { angle: 90, type: "landscape-primary" },
      },
    };

    const result = getTestMetadata({ defaultView: view } as unknown as Document);

    expect(result.testEnvironment).toEqual({
      userAgent: "",
      windowWidth: 800,
      windowHeight: 600,
      orientationAngle: 90,
      orientationType: "landscape-primary",
    });
  });

  it("falls back for throwing document access and invalid host values", () => {
    const inaccessibleDocument = {
      get defaultView() {
        throw new Error("window unavailable");
      },
    };
    const malformedDocument = {
      defaultView: {
        navigator: { userAgent: 123 },
        innerWidth: Number.NaN,
        innerHeight: 600,
        screen: { orientation: { angle: Number.POSITIVE_INFINITY, type: null } },
      },
    };

    expect(getTestMetadata(inaccessibleDocument as unknown as Document).testEnvironment).toEqual(
      fallbackEnvironment,
    );
    expect(getTestMetadata(malformedDocument as unknown as Document).testEnvironment).toEqual({
      ...fallbackEnvironment,
      windowHeight: 600,
    });
  });
});
