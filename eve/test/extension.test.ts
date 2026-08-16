import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// eve's bundler shim hands each mounted extension a config scope, and
// `defineExtension` captures it when the module is evaluated. Without one a
// handle still validates its input but binds nothing, and every later
// `.config` read throws. Setting it here is what makes these tests exercise
// the real mount path rather than a half-initialised handle — which is also
// why nothing below imports the extension statically.
const CONFIG_SCOPE = Symbol.for("eve.ext-config-scope");

interface Config {
  apiKey: string;
  url?: string;
  approval?: "never" | "once" | "always";
}

async function load() {
  vi.resetModules();
  (globalThis as unknown as Record<symbol, string>)[CONFIG_SCOPE] = "accesslint-test";

  return import("../extension/extension.js");
}

// Mounts, then imports the connection the way the runtime does: after config
// is bound, in the same module generation.
async function mount(values: Config) {
  const { default: extension, DEFAULT_URL } = await load();
  extension(values);
  const { default: connection } = await import("../extension/connections/accesslint.js");

  return { extension, connection, DEFAULT_URL };
}

describe("config", () => {
  it("binds the key and defaults to the production connector, unattended", async () => {
    const { extension, DEFAULT_URL } = await mount({ apiKey: "alk_live" });

    expect(extension.config).toMatchObject({
      apiKey: "alk_live",
      url: DEFAULT_URL,
      approval: "never",
    });
  });

  it("takes a url override, for staging", async () => {
    const { extension } = await mount({
      apiKey: "alk_live",
      url: "https://mcp-staging.accesslint.test/mcp",
    });

    expect(extension.config.url).toBe("https://mcp-staging.accesslint.test/mcp");
  });

  // Failing at the mount site beats failing three turns into a conversation.
  it("refuses a missing key", async () => {
    const { default: extension } = await load();

    expect(() => extension({ apiKey: "" })).toThrow(/apiKey/);
  });

  it("refuses a url that is not one", async () => {
    const { default: extension } = await load();

    expect(() => extension({ apiKey: "alk_live", url: "mcp.accesslint.com" })).toThrow(/url/);
  });

  it("refuses an approval policy eve does not have", async () => {
    const { default: extension } = await load();

    // @ts-expect-error the schema is the guard under test
    expect(() => extension({ apiKey: "alk_live", approval: "sometimes" })).toThrow(/approval/);
  });
});

describe("the connection", () => {
  it("points at the configured connector", async () => {
    const { connection, DEFAULT_URL } = await mount({ apiKey: "alk_live" });

    expect(connection.url).toBe(DEFAULT_URL);
  });

  it("follows a url override, so a staging mount does not talk to production", async () => {
    const { connection } = await mount({
      apiKey: "alk_live",
      url: "https://mcp-staging.accesslint.test/mcp",
    });

    expect(connection.url).toBe("https://mcp-staging.accesslint.test/mcp");
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

  it("gates on approval only when asked to", async () => {
    const open = await mount({ apiKey: "alk_live" });
    const gated = await mount({ apiKey: "alk_live", approval: "always" });

    expect(open.connection.approval).not.toEqual(gated.connection.approval);
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

  it("says approval belongs to a person", () => {
    expect(instructions).toMatch(/approv/i);
    expect(instructions).toContain("AccessLint web app");
  });

  it("says page text is data, never instruction", () => {
    expect(instructions).toMatch(/never instruction/i);
  });
});
