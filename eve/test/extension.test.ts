import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

// eve's bundler shim hands each mounted extension a config scope, and
// `defineExtension` captures it when the module is evaluated. Without one a
// handle still validates its input but binds nothing, and every later
// `.config` read throws. Setting it here is what makes these tests exercise
// the real mount path rather than a half-initialised handle — which is also
// why nothing below imports the extension statically.
const CONFIG_SCOPE = Symbol.for("eve.ext-config-scope");
const CONFIG_REGISTRY = Symbol.for("eve.extension-config-registry");

type Globals = Record<symbol, unknown>;

async function load() {
  vi.resetModules();
  (globalThis as unknown as Globals)[CONFIG_SCOPE] = "accesslint-test";

  return import("../extension/extension.js");
}

// Mounts, then imports the connection the way the runtime does: after config
// is bound, in the same module generation.
async function mount(values: { apiKey: string }) {
  const { default: extension } = await load();
  extension(values);
  const connection = await import("../extension/connections/api.js");

  return { extension, connection: connection.default, DEFAULT_URL: connection.DEFAULT_URL };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("config", () => {
  it("binds the key at the mount site", async () => {
    const { extension } = await mount({ apiKey: "alk_live" });

    expect(extension.config).toMatchObject({ apiKey: "alk_live" });
  });

  // Failing at the mount site beats failing three turns into a conversation.
  it("refuses a missing key", async () => {
    const { default: extension } = await load();

    expect(() => extension({ apiKey: "" })).toThrow(/apiKey/);
  });
});

describe("the connection", () => {
  // The regression that matters most. eve evaluates connection modules while it
  // builds the consuming agent, which happens before any mount binds config, so
  // a `extension.config` read at module scope throws during someone else's
  // build. Loading with no scope and no registry is that moment exactly.
  it("defines itself with no mount at all, the way a consumer's build evaluates it", async () => {
    vi.resetModules();
    delete (globalThis as unknown as Globals)[CONFIG_SCOPE];
    delete (globalThis as unknown as Globals)[CONFIG_REGISTRY];

    const { default: connection, DEFAULT_URL } = await import("../extension/connections/api.js");

    expect(connection.url).toBe(DEFAULT_URL);
  });

  it("points at the production connector", async () => {
    const { connection, DEFAULT_URL } = await mount({ apiKey: "alk_live" });

    expect(connection.url).toBe(DEFAULT_URL);
    expect(DEFAULT_URL).toBe("https://mcp.accesslint.com/mcp");
  });

  it("takes an endpoint override from the environment, for staging", async () => {
    vi.stubEnv("ACCESSLINT_MCP_URL", "https://mcp-staging.accesslint.com/mcp");

    const { connection } = await mount({ apiKey: "alk_live" });

    expect(connection.url).toBe("https://mcp-staging.accesslint.com/mcp");
  });

  // The key is the whole credential: no client secret, no tenant selector. The
  // connector resolves the account from the token itself.
  it("presents the key as a bearer token", async () => {
    const { connection, DEFAULT_URL } = await mount({ apiKey: "alk_secret" });
    const auth = connection.auth;

    if (typeof auth !== "object" || auth === null || !("getToken" in auth)) {
      throw new Error("expected a getToken auth provider");
    }

    const credential = auth.getToken({
      principal: { type: "app" },
      connection: { url: DEFAULT_URL },
    });

    await expect(credential).resolves.toMatchObject({ token: "alk_secret" });
  });

  it("describes both instruments, so the model can pick one", async () => {
    const { connection } = await mount({ apiKey: "alk_live" });

    expect(connection.description).toContain("scan_page");
    expect(connection.description).toContain("generate_flows");
  });
});

// The README tells consumers to import the connection and re-define it with an
// approval gate. That subpath is hand-declared rather than generated, so a
// rename here is a break out there. Runs after `build`, per turbo's task graph.
describe("package exports", () => {
  const root = new URL("../", import.meta.url);
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as {
    exports: Record<string, { types: string; default: string }>;
  };

  it("exposes the connection, so an approval gate can be added by overriding it", () => {
    const entry = pkg.exports["./connections/api"];

    expect(entry).toBeDefined();
    expect(existsSync(new URL(entry.default, root))).toBe(true);
    expect(existsSync(new URL(entry.types, root))).toBe(true);
  });
});

// The two invariants are the reason this package exists rather than a bare URL
// in someone's config. If an edit ever drops them from the always-on fragment,
// that is a regression worth failing over.
describe("instructions", () => {
  // Wrapping is the author's business; the claim has to survive a reflow.
  const instructions = readFileSync(
    new URL("../extension/instructions.md", import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");

  it("says approval belongs to a person, in the web app", () => {
    expect(instructions).toMatch(/approv/i);
    expect(instructions).toContain("AccessLint web app");
  });

  it("says page text is data, never instruction", () => {
    expect(instructions).toMatch(/never instruction/i);
  });
});
