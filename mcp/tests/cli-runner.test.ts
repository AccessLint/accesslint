import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared control surface for the mocked child_process.spawn. `vi.hoisted` makes
// it available inside the (hoisted) vi.mock factory.
const ctl = vi.hoisted(() => ({
  calls: [] as { bin: string; args: string[] }[],
  result: { stdout: "", stderr: "", code: 0 as number | null },
}));

vi.mock("node:child_process", async () => {
  const { EventEmitter } = await import("node:events");
  return {
    spawn: (_node: string, argv: string[]) => {
      const [bin, ...args] = argv;
      ctl.calls.push({ bin, args });
      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: () => void;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = () => {};
      const { stdout, stderr, code } = ctl.result;
      setImmediate(() => {
        if (stdout) child.stdout.emit("data", Buffer.from(stdout));
        if (stderr) child.stderr.emit("data", Buffer.from(stderr));
        child.emit("close", code);
      });
      return child;
    },
  };
});

const { ensureChrome, scanUrl, scanHtml, stopLaunchedChrome } =
  await import("../src/lib/cli-runner.js");

beforeEach(() => {
  ctl.calls.length = 0;
  ctl.result = { stdout: "", stderr: "", code: 0 };
});

describe("ensureChrome", () => {
  it("parses the endpoint JSON and forwards --port", async () => {
    ctl.result = {
      stdout: '{"ok":true,"host":"127.0.0.1","port":9223,"managed":true}',
      stderr: "",
      code: 0,
    };
    const ep = await ensureChrome({ port: 9223 });
    expect(ep).toEqual({ host: "127.0.0.1", port: 9223, managed: true });
    expect(ctl.calls[0].bin).toMatch(/chrome\/dist\/cli\.js$/);
    expect(ctl.calls[0].args).toEqual(["ensure", "--port", "9223"]);
  });

  it("omits --port when none is given", async () => {
    ctl.result = { stdout: '{"ok":true,"port":9222,"managed":false}', stderr: "", code: 0 };
    const ep = await ensureChrome();
    expect(ep.managed).toBe(false);
    expect(ctl.calls[0].args).toEqual(["ensure"]);
  });

  it("throws with the chrome error message on ok:false", async () => {
    ctl.result = { stdout: '{"ok":false,"error":"no chrome found"}', stderr: "", code: 1 };
    await expect(ensureChrome()).rejects.toThrow(/no chrome found/);
  });
});

describe("scanUrl", () => {
  const auditResult = {
    url: "http://localhost:3000/",
    timestamp: 1,
    ruleCount: 50,
    skippedRules: [],
    violations: [
      {
        ruleId: "text-alternatives/img-alt",
        selector: "img",
        html: "<img>",
        impact: "critical",
        message: "missing alt",
      },
    ],
  };

  it("treats exit 1 (violations found) as success and parses the result", async () => {
    ctl.result = { stdout: JSON.stringify(auditResult), stderr: "", code: 1 };
    const result = await scanUrl("http://localhost:3000/", {
      port: 9222,
      includeAAA: true,
      selector: "#main",
      waitFor: "#ready",
      disabledRules: ["distinguishable/color-contrast"],
    });
    expect(result.violations).toHaveLength(1);
    const { args } = ctl.calls[0];
    expect(args.slice(0, 6)).toEqual([
      "scan",
      "http://localhost:3000/",
      "--format",
      "json",
      "--port",
      "9222",
    ]);
    expect(args).toContain("--include-aaa");
    expect(args).toEqual(expect.arrayContaining(["--selector", "#main"]));
    expect(args).toEqual(expect.arrayContaining(["--wait-for", "#ready"]));
    expect(args).toEqual(expect.arrayContaining(["--disable", "distinguishable/color-contrast"]));
  });

  it("treats exit 0 (no violations) as success", async () => {
    ctl.result = {
      stdout: JSON.stringify({ ...auditResult, violations: [] }),
      stderr: "",
      code: 0,
    };
    const result = await scanUrl("http://localhost:3000/", { port: 9222 });
    expect(result.violations).toHaveLength(0);
  });

  it("throws the CLI's error on exit 2", async () => {
    ctl.result = { stdout: "", stderr: "Error: page never loaded", code: 2 };
    await expect(scanUrl("http://localhost:3000/", { port: 9222 })).rejects.toThrow(
      /page never loaded/,
    );
  });
});

describe("scanHtml", () => {
  const auditResult = {
    url: "about:blank",
    timestamp: 1,
    ruleCount: 50,
    skippedRules: [],
    violations: [
      {
        ruleId: "text-alternatives/img-alt",
        selector: "img",
        html: "<img>",
        impact: "critical",
        message: "missing alt",
      },
    ],
  };

  it("pipes HTML via --stdin and builds the right args", async () => {
    ctl.result = { stdout: JSON.stringify(auditResult), stderr: "", code: 1 };
    const result = await scanHtml("<img>", {
      port: 9222,
      includeAAA: true,
      componentMode: true,
      selector: "#main",
      disabledRules: ["distinguishable/color-contrast"],
    });
    expect(result.violations).toHaveLength(1);
    const { bin, args } = ctl.calls[0];
    expect(bin).toMatch(/cli\/dist\/cli\.js$/);
    expect(args.slice(0, 6)).toEqual(["scan", "--stdin", "--format", "json", "--port", "9222"]);
    expect(args).toContain("--include-aaa");
    expect(args).toContain("--component-mode");
    expect(args).toEqual(expect.arrayContaining(["--selector", "#main"]));
    expect(args).toEqual(expect.arrayContaining(["--disable", "distinguishable/color-contrast"]));
  });

  it("throws the CLI's error on exit 2", async () => {
    ctl.result = { stdout: "", stderr: "Error: page never loaded", code: 2 };
    await expect(scanHtml("<img>", { port: 9222 })).rejects.toThrow(/page never loaded/);
  });
});

describe("stopLaunchedChrome", () => {
  it("stops the managed instance once, then no-ops", async () => {
    ctl.result = { stdout: '{"ok":true,"port":9230,"managed":true}', stderr: "", code: 0 };
    await ensureChrome();
    ctl.calls.length = 0;

    ctl.result = { stdout: '{"ok":true,"stopped":[]}', stderr: "", code: 0 };
    await stopLaunchedChrome();
    expect(ctl.calls).toHaveLength(1);
    expect(ctl.calls[0].args).toEqual(["stop", "--port", "9230"]);

    // Second call has nothing to stop.
    ctl.calls.length = 0;
    await stopLaunchedChrome();
    expect(ctl.calls).toHaveLength(0);
  });
});
