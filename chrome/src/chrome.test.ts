import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolvePort } from "./chrome.js";
import { listStates, readState, removeState, writeState } from "./state.js";

describe("resolvePort", () => {
  const saved = process.env.ACCESSLINT_CDP_PORT;
  afterEach(() => {
    if (saved === undefined) delete process.env.ACCESSLINT_CDP_PORT;
    else process.env.ACCESSLINT_CDP_PORT = saved;
  });

  it("defaults to 9222", () => {
    delete process.env.ACCESSLINT_CDP_PORT;
    expect(resolvePort()).toBe(9222);
  });

  it("prefers explicit opt over env", () => {
    process.env.ACCESSLINT_CDP_PORT = "9000";
    expect(resolvePort({ port: 9300 })).toBe(9300);
  });

  it("falls back to env", () => {
    process.env.ACCESSLINT_CDP_PORT = "9001";
    expect(resolvePort()).toBe(9001);
  });
});

describe("state file roundtrip", () => {
  const port = 65535; // unlikely to collide with a real instance
  const state = { pid: 4242, port, userDataDir: "/tmp/x", startedAt: "2026-01-01T00:00:00.000Z" };
  beforeEach(() => removeState(port));
  afterEach(() => removeState(port));

  it("writes, reads back, lists, and removes", () => {
    writeState(state);
    expect(readState(port)).toEqual(state);
    expect(listStates().some((s) => s.port === port)).toBe(true);
    removeState(port);
    expect(readState(port)).toBeNull();
  });
});
