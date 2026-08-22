# Releasing

Each package publishes from its own tag. Pushing `mcp/v0.11.0` runs
`.github/workflows/publish-mcp.yml`, which builds, tests, pins dependencies,
and publishes to npm.

## Order matters

Publish in dependency order, bottom up:

```
core  →  chrome  →  cli  →  mcp
```

Everything else (`jest`, `vitest`, `playwright`, `report`, `source`,
`storybook-addon`) depends only on `core`, so it can go any time after `core`.

The reason is that dependencies are pinned to **exact** versions at publish
time. If `mcp` pins `core@0.21.0` but the `cli` it also pins was published
against `core@0.16.0`, npm installs both copies. The engine that runs the audit
is then a different build from the one supplying rule metadata, which silently
drops fields from output and lets rules slip past `rules` and `wcag`
allow-lists.

`scripts/prepare-publish.mjs` runs in every publish workflow and fails the
build when that would happen, naming the package to release first. It also
fails on any `@accesslint/*` dependency left as a range, because on a `0.x`
version a caret pins the minor: `@accesslint/mcp@0.10.0` shipped
`cli: ^0.10.0` and stayed on the one CLI release with the Windows path bug for
six weeks after the fix went out, which is [AccessLint/skills#8].

Run it locally before tagging to see what the workflow will see:

```sh
node scripts/prepare-publish.mjs mcp
git checkout mcp/package.json   # it rewrites in place
```

## Cutting a release

`core` has a script that does the whole dance:

```sh
bun run --filter=@accesslint/core release 0.22.0
```

For the others, by hand from a clean `origin/main`:

```sh
npm pkg set version=0.13.0 --workspace=@accesslint/cli
git commit -am "Release @accesslint/cli v0.13.0"
git push origin HEAD:main
git tag cli/v0.13.0 && git push origin cli/v0.13.0
```

Use `npm pkg set version`, not `npm version` — the latter exits 1 on this bun
workspace because it chokes on `workspace:*` while installing.

[AccessLint/skills#8]: https://github.com/AccessLint/skills/issues/8
