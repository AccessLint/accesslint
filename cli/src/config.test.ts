import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadConfig,
  selectTarget,
  CONFIG_FILENAME,
  LOCAL_CONFIG_FILENAME,
  type AccessLintConfig,
} from "./config.js";

describe("loadConfig", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "accesslint-cfg-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const writeBase = (c: AccessLintConfig) =>
    writeFile(join(dir, CONFIG_FILENAME), JSON.stringify(c));
  const writeLocal = (c: AccessLintConfig) =>
    writeFile(join(dir, LOCAL_CONFIG_FILENAME), JSON.stringify(c));

  it("returns null when no config exists", async () => {
    expect(await loadConfig(dir)).toBeNull();
  });

  it("loads the base config", async () => {
    await writeBase({ default: "dev", targets: { dev: { url: "http://localhost:3000" } } });
    const cfg = await loadConfig(dir);
    expect(cfg?.default).toBe("dev");
    expect(cfg?.targets.dev.url).toBe("http://localhost:3000");
  });

  it("merges the local overlay over the base", async () => {
    await writeBase({ default: "dev", targets: { dev: { url: "http://localhost:3000" } } });
    await writeLocal({ targets: { prod: { url: "https://app.example.com" } } });
    const cfg = await loadConfig(dir);
    expect(Object.keys(cfg!.targets).sort()).toEqual(["dev", "prod"]);
  });

  it("lets the local overlay override a base target and the default", async () => {
    await writeBase({ default: "dev", targets: { dev: { url: "http://localhost:3000" } } });
    await writeLocal({ default: "prod", targets: { dev: { url: "http://localhost:9999" } } });
    const cfg = await loadConfig(dir);
    expect(cfg?.default).toBe("prod");
    expect(cfg?.targets.dev.url).toBe("http://localhost:9999");
  });

  it("throws a clear error on malformed JSON", async () => {
    await writeFile(join(dir, CONFIG_FILENAME), "{ not json");
    await expect(loadConfig(dir)).rejects.toThrow(/Invalid JSON/);
  });
});

describe("selectTarget", () => {
  const config: AccessLintConfig = {
    default: "dev",
    targets: {
      dev: { url: "http://localhost:5173", waitFor: "#app" },
      prod: { url: "https://app.example.com" },
    },
  };

  it("resolves a named target", () => {
    expect(selectTarget(config, "prod")).toEqual({
      name: "prod",
      url: "https://app.example.com",
    });
  });

  it("uses the default target when no source is given", () => {
    expect(selectTarget(config, undefined)?.name).toBe("dev");
  });

  it("returns null when no source and no default is set", () => {
    expect(selectTarget({ targets: config.targets }, undefined)).toBeNull();
  });

  it("returns null for a URL source (falls through to a live audit)", () => {
    expect(selectTarget(config, "https://example.com")).toBeNull();
  });

  it("returns null for a file-path source (falls through to a file audit)", () => {
    expect(selectTarget(config, "index.html")).toBeNull();
    expect(selectTarget(config, "./dist/index.html")).toBeNull();
  });

  it("throws listing available targets for an unknown bare name", () => {
    expect(() => selectTarget(config, "stage")).toThrow(/Unknown target "stage".*dev, prod/);
  });

  it("returns null when there is no config", () => {
    expect(selectTarget(null, "dev")).toBeNull();
  });
});
