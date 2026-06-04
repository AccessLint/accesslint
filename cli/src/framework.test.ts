import { describe, it, expect } from "vitest";
import { inferDefaults, parsePortFromScript } from "./framework.js";

describe("parsePortFromScript", () => {
  it("parses -p", () => expect(parsePortFromScript("next dev -p 4000")).toBe(4000));
  it("parses --port", () => expect(parsePortFromScript("vite --port 4000")).toBe(4000));
  it("parses --port=", () => expect(parsePortFromScript("astro dev --port=4321")).toBe(4321));
  it("returns null when absent", () => expect(parsePortFromScript("next dev")).toBeNull());
  it("returns null for undefined", () => expect(parsePortFromScript(undefined)).toBeNull());
});

describe("inferDefaults — dev URL", () => {
  it("vite → 5173", () =>
    expect(inferDefaults({ devDependencies: { vite: "^5" } }).devUrl).toBe(
      "http://localhost:5173",
    ));
  it("next → 3000", () =>
    expect(inferDefaults({ dependencies: { next: "^14" } }).devUrl).toBe("http://localhost:3000"));
  it("astro wins over its bundled vite → 4321", () =>
    expect(
      inferDefaults({ dependencies: { astro: "^4" }, devDependencies: { vite: "^5" } }).devUrl,
    ).toBe("http://localhost:4321"));
  it("angular → 4200", () =>
    expect(inferDefaults({ dependencies: { "@angular/core": "^18" } }).devUrl).toBe(
      "http://localhost:4200",
    ));
  it("vue-cli → 8080", () =>
    expect(inferDefaults({ devDependencies: { "@vue/cli-service": "^5" } }).devUrl).toBe(
      "http://localhost:8080",
    ));
  it("gatsby → 8000", () =>
    expect(inferDefaults({ dependencies: { gatsby: "^5" } }).devUrl).toBe("http://localhost:8000"));
  it("sveltekit → 5173", () =>
    expect(inferDefaults({ devDependencies: { "@sveltejs/kit": "^2" } }).devUrl).toBe(
      "http://localhost:5173",
    ));
  it("remix (scoped prefix) → 3000", () =>
    expect(inferDefaults({ dependencies: { "@remix-run/react": "^2" } }).devUrl).toBe(
      "http://localhost:3000",
    ));
  it("explicit dev-script port overrides the framework default", () =>
    expect(
      inferDefaults({ dependencies: { next: "^14" }, scripts: { dev: "next dev -p 4000" } }).devUrl,
    ).toBe("http://localhost:4000"));
  it("falls back to start script port", () =>
    expect(inferDefaults({ scripts: { start: "serve -p 9000" } }).devUrl).toBe(
      "http://localhost:9000",
    ));
  it("no framework → 3000", () => expect(inferDefaults({}).devUrl).toBe("http://localhost:3000"));
  it("null package.json → 3000", () =>
    expect(inferDefaults(null).devUrl).toBe("http://localhost:3000"));
});

describe("inferDefaults — framework label", () => {
  it("reports the matched framework", () =>
    expect(inferDefaults({ devDependencies: { vite: "^5" } }).framework).toBe("vite"));
  it("is null when nothing matches", () => expect(inferDefaults({}).framework).toBeNull());
});

describe("inferDefaults — storybook", () => {
  it("present via @storybook dep, default 6006", () => {
    const r = inferDefaults({ devDependencies: { "@storybook/react": "^8" } });
    expect(r.storybook.present).toBe(true);
    expect(r.storybook.url).toBe("http://localhost:6006");
  });
  it("present via script with a custom port", () => {
    const r = inferDefaults({ scripts: { storybook: "storybook dev -p 7007" } });
    expect(r.storybook.present).toBe(true);
    expect(r.storybook.url).toBe("http://localhost:7007");
  });
  it("absent when no storybook signal", () =>
    expect(inferDefaults({ devDependencies: { vite: "^5" } }).storybook.present).toBe(false));
});
