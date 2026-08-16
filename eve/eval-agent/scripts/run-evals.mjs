import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Starts the canned MCP server, points the extension at it, and hands off to
// `eve eval`. Doing it here rather than in each eval keeps the stub's lifetime
// tied to the run: the port is chosen by the OS, so two runs never collide, and
// the server always goes away, including when eve exits non-zero.
//
// Relies on Node's type stripping to import the TypeScript stub directly.

const { startStub } = await import("../stub/server.ts");
const stub = await startStub();

const child = spawn("eve", ["eval", ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
  env: {
    ...process.env,
    // The whole point of the run: the extension reads this at module scope, so
    // the agent under test talks to the stub and never to production.
    ACCESSLINT_MCP_URL: stub.url,
  },
});

const code = await new Promise((resolve) => {
  child.on("exit", (value) => resolve(value ?? 1));
  child.on("error", (error) => {
    console.error(`could not start eve: ${error.message}`);
    resolve(1);
  });
});

await stub.close();
process.exit(code);
