import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildConfig, resolveAnswers, runInit } from "./init.js";
import { inferDefaults } from "./framework.js";
import { CONFIG_FILENAME, LOCAL_CONFIG_FILENAME } from "./config.js";

describe("buildConfig", () => {
  it("dev only", () => {
    const { base, local } = buildConfig({
      devUrl: "http://localhost:3000",
      storybookUrl: null,
      prodUrl: null,
      defaultTarget: "dev",
    });
    expect(base).toEqual({ default: "dev", targets: { dev: { url: "http://localhost:3000" } } });
    expect(local).toBeUndefined();
  });

  it("with storybook and a prod overlay", () => {
    const { base, local } = buildConfig({
      devUrl: "http://localhost:5173",
      storybookUrl: "http://localhost:6006",
      prodUrl: "https://app.example.com",
      defaultTarget: "dev",
    });
    expect(base.targets.storybook.url).toBe("http://localhost:6006");
    expect(local?.targets.prod.url).toBe("https://app.example.com");
  });
});

describe("resolveAnswers", () => {
  it("does NOT add storybook by default, even when present", () => {
    const d = inferDefaults({ devDependencies: { "@storybook/react": "^8", vite: "^5" } });
    expect(resolveAnswers(d, {}).storybookUrl).toBeNull();
  });
  it("adds storybook only when explicitly requested", () => {
    const d = inferDefaults({ devDependencies: { "@storybook/react": "^8" } });
    expect(resolveAnswers(d, { storybook: true }).storybookUrl).toBe("http://localhost:6006");
  });
  it("--skip-storybook overrides --storybook", () => {
    const d = inferDefaults({ devDependencies: { "@storybook/react": "^8" } });
    expect(resolveAnswers(d, { storybook: true, skipStorybook: true }).storybookUrl).toBeNull();
  });
  it("--dev-url overrides the inferred default", () => {
    expect(resolveAnswers(inferDefaults(null), { devUrl: "http://localhost:9999" }).devUrl).toBe(
      "http://localhost:9999",
    );
  });
});

describe("runInit (non-interactive)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "accesslint-init-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a config from the framework default", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({ devDependencies: { vite: "^5" } }));
    const result = await runInit({ cwd: dir, yes: true });
    expect(result.framework).toBe("vite");
    const cfg = JSON.parse(await readFile(join(dir, CONFIG_FILENAME), "utf8"));
    expect(cfg.default).toBe("dev");
    expect(cfg.targets.dev.url).toBe("http://localhost:5173");
  });

  it("adds a storybook target with --storybook", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({ dependencies: { next: "^14" } }));
    await runInit({ cwd: dir, yes: true, storybook: true });
    const cfg = JSON.parse(await readFile(join(dir, CONFIG_FILENAME), "utf8"));
    expect(cfg.targets.storybook.url).toBe("http://localhost:6006");
  });

  it("writes prod to the gitignored overlay and updates .gitignore", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({}));
    const result = await runInit({ cwd: dir, yes: true, prodUrl: "https://app.example.com" });
    const local = JSON.parse(await readFile(join(dir, LOCAL_CONFIG_FILENAME), "utf8"));
    expect(local.targets.prod.url).toBe("https://app.example.com");
    expect(result.gitignoreUpdated).toBe(true);
    expect(await readFile(join(dir, ".gitignore"), "utf8")).toContain(LOCAL_CONFIG_FILENAME);
  });

  it("does not duplicate an existing .gitignore entry", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({}));
    await writeFile(join(dir, ".gitignore"), `node_modules\n${LOCAL_CONFIG_FILENAME}\n`);
    const result = await runInit({ cwd: dir, yes: true, prodUrl: "https://app.example.com" });
    expect(result.gitignoreUpdated).toBe(false);
    const gi = await readFile(join(dir, ".gitignore"), "utf8");
    expect(gi.match(new RegExp(LOCAL_CONFIG_FILENAME, "g"))).toHaveLength(1);
  });

  it("refuses to overwrite an existing config without --force", async () => {
    await writeFile(join(dir, CONFIG_FILENAME), "{}");
    await expect(runInit({ cwd: dir, yes: true })).rejects.toThrow(/already exists/);
  });

  it("overwrites with --force", async () => {
    await writeFile(join(dir, CONFIG_FILENAME), "{}");
    await runInit({ cwd: dir, yes: true, force: true });
    const cfg = JSON.parse(await readFile(join(dir, CONFIG_FILENAME), "utf8"));
    expect(cfg.targets.dev).toBeDefined();
  });
});
