import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensure, resolveDownload, resolvePort } from "./chrome.js";
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

describe("resolveDownload", () => {
  const saved = process.env.ACCESSLINT_CHROME_DOWNLOAD;
  afterEach(() => {
    if (saved === undefined) delete process.env.ACCESSLINT_CHROME_DOWNLOAD;
    else process.env.ACCESSLINT_CHROME_DOWNLOAD = saved;
  });

  it("defaults to false", () => {
    delete process.env.ACCESSLINT_CHROME_DOWNLOAD;
    expect(resolveDownload()).toBe(false);
  });

  it("honors the env flag", () => {
    process.env.ACCESSLINT_CHROME_DOWNLOAD = "1";
    expect(resolveDownload()).toBe(true);
  });

  it("prefers explicit opt over env", () => {
    process.env.ACCESSLINT_CHROME_DOWNLOAD = "1";
    expect(resolveDownload({ download: false })).toBe(false);
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

describe("ensure", () => {
  it("fails on a pinned port held by a non-CDP process instead of stepping", async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as AddressInfo).port;
    try {
      await expect(ensure({ port })).rejects.toThrow(/doesn't serve CDP discovery/);
      expect(listStates().some((s) => s.port === port)).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
