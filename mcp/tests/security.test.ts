import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertSafeUrl,
  BlockedUrlError,
} from "@accesslint/cli/ssrf-guard";
import { safeFetch, FetchLimitError } from "@accesslint/cli/safe-fetch";

describe("ssrf-guard", () => {
  describe("scheme validation", () => {
    it("accepts http", async () => {
      await expect(assertSafeUrl("http://example.com/")).resolves.toBeInstanceOf(URL);
    });

    it("accepts https", async () => {
      await expect(assertSafeUrl("https://example.com/")).resolves.toBeInstanceOf(URL);
    });

    it("rejects file://", async () => {
      await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(BlockedUrlError);
    });

    it("rejects javascript:", async () => {
      await expect(assertSafeUrl("javascript:alert(1)")).rejects.toThrow(BlockedUrlError);
    });

    it("rejects gopher://", async () => {
      await expect(assertSafeUrl("gopher://example.com/")).rejects.toThrow(BlockedUrlError);
    });
  });

  describe("metadata endpoints (always blocked)", () => {
    it("blocks AWS/GCP/Azure IMDS v4", async () => {
      await expect(
        assertSafeUrl("http://169.254.169.254/latest/meta-data/")
      ).rejects.toThrow(BlockedUrlError);
    });

    it("blocks AWS IMDS v4 even with allowPrivateNetwork", async () => {
      await expect(
        assertSafeUrl("http://169.254.169.254/", { allowPrivateNetwork: true })
      ).rejects.toThrow(/metadata/);
    });

    it("blocks Alibaba metadata", async () => {
      await expect(
        assertSafeUrl("http://100.100.100.200/", { allowPrivateNetwork: true })
      ).rejects.toThrow(/metadata/);
    });

    it("blocks metadata.google.internal", async () => {
      await expect(
        assertSafeUrl("http://metadata.google.internal/", { allowPrivateNetwork: true })
      ).rejects.toThrow(BlockedUrlError);
    });

    it("blocks AWS IPv6 metadata", async () => {
      await expect(
        assertSafeUrl("http://[fd00:ec2::254]/", { allowPrivateNetwork: true })
      ).rejects.toThrow(/metadata/);
    });
  });

  describe("private ranges (blocked by default)", () => {
    it("blocks IPv4 loopback", async () => {
      await expect(assertSafeUrl("http://127.0.0.1/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks 10.0.0.0/8", async () => {
      await expect(assertSafeUrl("http://10.0.0.5/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks 172.16.0.0/12", async () => {
      await expect(assertSafeUrl("http://172.20.1.1/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks 192.168.0.0/16", async () => {
      await expect(assertSafeUrl("http://192.168.1.1/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks CGNAT 100.64.0.0/10", async () => {
      await expect(assertSafeUrl("http://100.64.0.1/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks IPv6 loopback", async () => {
      await expect(assertSafeUrl("http://[::1]/")).rejects.toThrow(BlockedUrlError);
    });

    it("blocks IPv6 ULA", async () => {
      await expect(assertSafeUrl("http://[fd12:3456:789a::1]/")).rejects.toThrow(BlockedUrlError);
    });

    it("allows loopback when allowPrivateNetwork is true", async () => {
      await expect(
        assertSafeUrl("http://127.0.0.1:3000/", { allowPrivateNetwork: true })
      ).resolves.toBeInstanceOf(URL);
    });

    it("allows 192.168.x.x when allowPrivateNetwork is true", async () => {
      await expect(
        assertSafeUrl("http://192.168.1.1/", { allowPrivateNetwork: true })
      ).resolves.toBeInstanceOf(URL);
    });
  });

  describe("hostname resolution", () => {
    it("blocks localhost (resolves to 127.0.0.1)", async () => {
      await expect(assertSafeUrl("http://localhost/")).rejects.toThrow(BlockedUrlError);
    });

    it("allows localhost when allowPrivateNetwork is true", async () => {
      await expect(
        assertSafeUrl("http://localhost:3000/", { allowPrivateNetwork: true })
      ).resolves.toBeInstanceOf(URL);
    });
  });
});

describe("safeFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchSequence(responses: Array<{ status?: number; headers?: Record<string, string>; body?: string | null }>) {
    let idx = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const r = responses[idx++] ?? responses[responses.length - 1];
        const headers = new Headers(r.headers);
        return new Response(r.body ?? "", {
          status: r.status ?? 200,
          headers,
        });
      }),
    );
  }

  it("re-validates redirect targets against the SSRF guard", async () => {
    mockFetchSequence([
      { status: 302, headers: { location: "http://169.254.169.254/" } },
    ]);
    await expect(safeFetch("https://example.com/")).rejects.toThrow(/metadata/);
  });

  it("re-validates redirect targets against private-network policy", async () => {
    mockFetchSequence([
      { status: 302, headers: { location: "http://127.0.0.1:8080/admin" } },
    ]);
    await expect(safeFetch("https://example.com/")).rejects.toThrow(BlockedUrlError);
  });

  it("follows allowed redirects", async () => {
    mockFetchSequence([
      { status: 301, headers: { location: "https://example.org/final" } },
      { status: 200, headers: { "content-type": "text/html" }, body: "<p>ok</p>" },
    ]);
    const res = await safeFetch("https://example.com/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<p>ok</p>");
  });

  it("caps redirect depth", async () => {
    mockFetchSequence([
      { status: 302, headers: { location: "https://example.com/2" } },
      { status: 302, headers: { location: "https://example.com/3" } },
      { status: 302, headers: { location: "https://example.com/4" } },
      { status: 302, headers: { location: "https://example.com/5" } },
      { status: 302, headers: { location: "https://example.com/6" } },
      { status: 302, headers: { location: "https://example.com/7" } },
      { status: 302, headers: { location: "https://example.com/8" } },
    ]);
    await expect(safeFetch("https://example.com/1", { maxRedirects: 3 })).rejects.toThrow(/Too many redirects/);
  });

  it("rejects oversized responses via Content-Length", async () => {
    mockFetchSequence([
      { status: 200, headers: { "content-length": "99999999" }, body: "x" },
    ]);
    await expect(safeFetch("https://example.com/", { maxBytes: 1024 })).rejects.toThrow(FetchLimitError);
  });

  it("allows responses within cap", async () => {
    mockFetchSequence([
      { status: 200, headers: { "content-type": "text/html", "content-length": "4" }, body: "hiya" },
    ]);
    const res = await safeFetch("https://example.com/", { maxBytes: 1024 });
    expect(await res.text()).toBe("hiya");
  });
});

describe("input size caps", () => {
  it("audit_html rejects oversized input", async () => {
    const { registerAuditHtml } = await import("../src/tools/audit-html.js");
    const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
    const fakeServer = {
      tool: (name: string, _d: string, _s: unknown, h: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
        handlers[name] = h;
      },
    };
    // @ts-expect-error — minimal stub of McpServer
    registerAuditHtml(fakeServer);

    const huge = "x".repeat(11 * 1024 * 1024);
    const res = await handlers.audit_html({ html: huge });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exceeds/);
  });

  it("diff_html rejects oversized input", async () => {
    const { registerDiffHtml } = await import("../src/tools/diff-html.js");
    const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
    const fakeServer = {
      tool: (name: string, _d: string, _s: unknown, h: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
        handlers[name] = h;
      },
    };
    // @ts-expect-error — minimal stub of McpServer
    registerDiffHtml(fakeServer);

    const huge = "x".repeat(11 * 1024 * 1024);
    const res = await handlers.diff_html({ html: huge, before: "anything" });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/exceeds/);
  });

  it("audit_file rejects oversized files", async () => {
    const root = await mkdtemp(join(tmpdir(), "accesslint-jail-"));
    const big = join(root, "big.html");
    await writeFile(big, "x".repeat(11 * 1024 * 1024));

    const prev = process.env.ACCESSLINT_WORKSPACE_ROOT;
    process.env.ACCESSLINT_WORKSPACE_ROOT = root;
    try {
      const mod = await import("../src/tools/audit-file.js");
      const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
      const fakeServer = {
        tool: (name: string, _d: string, _s: unknown, h: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
          handlers[name] = h;
        },
      };
      // @ts-expect-error — minimal stub of McpServer
      mod.registerAuditFile(fakeServer);

      const res = await handlers.audit_file({ path: "big.html" });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/exceeds/);
    } finally {
      if (prev === undefined) delete process.env.ACCESSLINT_WORKSPACE_ROOT;
      else process.env.ACCESSLINT_WORKSPACE_ROOT = prev;
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("audit_file path jail", () => {
  it("rejects paths outside workspace root", async () => {
    const root = await mkdtemp(join(tmpdir(), "accesslint-jail-"));
    const outside = await mkdtemp(join(tmpdir(), "accesslint-outside-"));
    const secret = join(outside, "secret.html");
    await writeFile(secret, "<p>secret</p>");

    const prev = process.env.ACCESSLINT_WORKSPACE_ROOT;
    process.env.ACCESSLINT_WORKSPACE_ROOT = root;
    try {
      const { registerAuditFile } = await import("../src/tools/audit-file.js");
      const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
      const fakeServer = {
        tool: (name: string, _desc: string, _schema: unknown, handler: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
          handlers[name] = handler;
        },
      };
      // @ts-expect-error — minimal stub of McpServer
      registerAuditFile(fakeServer);

      // Absolute path outside root
      const resAbs = await handlers.audit_file({ path: secret });
      expect(resAbs.isError).toBe(true);
      expect(resAbs.content[0].text).toMatch(/outside workspace root/);

      // Relative traversal
      const resRel = await handlers.audit_file({ path: "../../../etc/passwd" });
      expect(resRel.isError).toBe(true);
      expect(resRel.content[0].text).toMatch(/outside workspace root/);
    } finally {
      if (prev === undefined) delete process.env.ACCESSLINT_WORKSPACE_ROOT;
      else process.env.ACCESSLINT_WORKSPACE_ROOT = prev;
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("rejects symlink escape", async () => {
    const root = await mkdtemp(join(tmpdir(), "accesslint-jail-"));
    const outside = await mkdtemp(join(tmpdir(), "accesslint-outside-"));
    await writeFile(join(outside, "secret.html"), "<p>secret</p>");
    await symlink(join(outside, "secret.html"), join(root, "link.html"));

    const prev = process.env.ACCESSLINT_WORKSPACE_ROOT;
    process.env.ACCESSLINT_WORKSPACE_ROOT = root;
    try {
      // Re-import to get fresh handler bound to the new env
      const mod = await import("../src/tools/audit-file.js");
      const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
      const fakeServer = {
        tool: (name: string, _desc: string, _schema: unknown, handler: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
          handlers[name] = handler;
        },
      };
      // @ts-expect-error — minimal stub of McpServer
      mod.registerAuditFile(fakeServer);

      const res = await handlers.audit_file({ path: "link.html" });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/outside workspace root/);
    } finally {
      if (prev === undefined) delete process.env.ACCESSLINT_WORKSPACE_ROOT;
      else process.env.ACCESSLINT_WORKSPACE_ROOT = prev;
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("accepts paths inside workspace root", async () => {
    const root = await mkdtemp(join(tmpdir(), "accesslint-jail-"));
    const sub = join(root, "pages");
    await mkdir(sub);
    const page = join(sub, "index.html");
    await writeFile(page, '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><img src="x"></body></html>');

    const prev = process.env.ACCESSLINT_WORKSPACE_ROOT;
    process.env.ACCESSLINT_WORKSPACE_ROOT = root;
    try {
      const mod = await import("../src/tools/audit-file.js");
      const handlers: Record<string, (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>> = {};
      const fakeServer = {
        tool: (name: string, _desc: string, _schema: unknown, handler: (args: unknown) => Promise<{ isError?: boolean; content: { text: string }[] }>) => {
          handlers[name] = handler;
        },
      };
      // @ts-expect-error — minimal stub of McpServer
      mod.registerAuditFile(fakeServer);

      const res = await handlers.audit_file({ path: "pages/index.html" });
      expect(res.isError).toBeFalsy();
    } finally {
      if (prev === undefined) delete process.env.ACCESSLINT_WORKSPACE_ROOT;
      else process.env.ACCESSLINT_WORKSPACE_ROOT = prev;
      await rm(root, { recursive: true, force: true });
    }
  });
});
