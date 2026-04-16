# AccessLint

Accessibility testing tools for modern web development.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@accesslint/core`](./core) | Core accessibility audit engine | [![npm](https://img.shields.io/npm/v/@accesslint/core)](https://www.npmjs.com/package/@accesslint/core) |
| [`@accesslint/cli`](./cli) | Command-line interface for auditing URLs and HTML | [![npm](https://img.shields.io/npm/v/@accesslint/cli)](https://www.npmjs.com/package/@accesslint/cli) |
| [`@accesslint/mcp`](./mcp) | MCP server for AI-assisted accessibility auditing | [![npm](https://img.shields.io/npm/v/@accesslint/mcp)](https://www.npmjs.com/package/@accesslint/mcp) |
| [`@accesslint/playwright`](./playwright) | Playwright matchers — `toBeAccessible()` | [![npm](https://img.shields.io/npm/v/@accesslint/playwright)](https://www.npmjs.com/package/@accesslint/playwright) |
| [`@accesslint/storybook-addon`](./storybook-addon) | Storybook addon for accessibility auditing | [![npm](https://img.shields.io/npm/v/@accesslint/storybook-addon)](https://www.npmjs.com/package/@accesslint/storybook-addon) |
| [`@accesslint/vitest`](./vitest) | Vitest matchers — `toBeAccessible()` | [![npm](https://img.shields.io/npm/v/@accesslint/vitest)](https://www.npmjs.com/package/@accesslint/vitest) |

## Development

This is a [Turborepo](https://turbo.build/repo) monorepo using [Bun](https://bun.sh) workspaces.

```sh
bun install
bun run build
bun run test
```
