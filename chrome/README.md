# @accesslint/chrome

Ensure a **debuggable Chrome** that AccessLint's live-DOM audits can drive, and
manage its lifecycle.

The AccessLint CLI (`@accesslint/cli`) is a pure CDP client: give it a debug
endpoint and a URL, and it injects `@accesslint/core` and audits. It does not
launch Chrome. This package fills that gap — and launches Chrome **detached** so
it outlives the one-shot launcher process that started it.

## Why a separate package

`chrome-launcher`'s `launch()` ties Chrome's lifetime to the calling process,
which is wrong for a `npx`-style one-shot: when the command exits, Chrome would
die before the audit connects. So this package spawns Chrome detached, records
its pid + throwaway profile to a state file, and exposes explicit `stop`.

It also encodes the **HTTP-discovery trap**: a Chrome opened via the DevTools
checkbox (or `chrome-devtools-mcp`) holds the debug port open but serves only a
WebSocket — `chrome-remote-interface` can't drive it. This package treats a
Chrome as usable only when `/json/version` answers, never on a bare TCP probe,
and steps to a free port when one is squatted.

## Usage

```bash
# Get-or-launch a driveable Chrome; prints its endpoint as JSON.
npx @accesslint/chrome ensure
# → {"ok":true,"mode":"launched","host":"127.0.0.1","port":9222,"pid":1234,"managed":true,...}

# Idempotent: a second ensure attaches to the running one.
npx @accesslint/chrome ensure        # → {"mode":"attached",...}

# Tear it down.
npx @accesslint/chrome stop --all
```

### Commands

| Command  | What it does                                                              |
| -------- | ------------------------------------------------------------------------- |
| `ensure` | Attach to a driveable Chrome on the port, or launch a detached one.       |
| `stop`   | Kill a managed instance (`--port`) or all of them (`--all`) and clean up. |

### Options

```
-p, --port <n>   CDP port to attach to / launch on (default 9222)
    --headed     Launch a visible Chrome instead of headless (ensure)
    --all        Stop every managed instance (stop)
```

If the preferred port is occupied by an **undriveable** Chrome (checkbox mode),
`ensure` steps to a free port and reports the actual one — read `port` from its
JSON output.

### Environment

```
ACCESSLINT_CDP_PORT   default port
CHROME_PATH           override Chrome binary discovery
```

## Library API

```ts
import { ensure, stop } from "@accesslint/chrome";

const chrome = await ensure({ port: 9222 }); // { mode, host, port, pid, managed, ... }
// … run an audit against chrome.host:chrome.port …
await stop({ port: chrome.port });
```

## License

MIT
