#!/usr/bin/env bash
set -euo pipefail

# Usage: bun run release <version>
#        bun run release <version> < notes.md
#
# Release notes piped on stdin become the commit body, under a
# "Release @accesslint/core vX.Y.Z" subject.

VERSION="${1:?Usage: scripts/release.sh <version> (e.g. 0.21.0)}"

# Strip leading 'v' if provided
VERSION="${VERSION#v}"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: '$VERSION' is not a valid semver version" >&2
  exit 1
fi

# The tag prefix publish-core.yml triggers on
TAG="core/v$VERSION"

cd "$(dirname "$0")/.."

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

# Release exactly what is on main, so the tag can never point at an
# unreviewed commit or leave main behind mid-release.
git fetch origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "Error: HEAD is not origin/main. Rebase onto origin/main first." >&2
  exit 1
fi

if git ls-remote --exit-code --tags origin "$TAG" >/dev/null 2>&1; then
  echo "Error: tag $TAG already exists on origin." >&2
  exit 1
fi

CURRENT="$(npm pkg get version | tr -d '"')"
if [ "$CURRENT" = "$VERSION" ]; then
  echo "Error: version is already $VERSION." >&2
  exit 1
fi

# The publish workflow gates on these; failing here costs a rerun, failing
# there strands a pushed tag that never publishes.
if [ "${SKIP_TESTS:-}" != "1" ]; then
  npx turbo run test build --filter=@accesslint/core
fi

# `npm version` exits 1 on this bun workspace (it chokes on workspace:*
# while installing), which under `set -e` would abort mid-release with the
# bump already written. `npm pkg set` only edits package.json.
npm pkg set version="$VERSION"

git add package.json
if [ -t 0 ]; then
  git commit -m "Release @accesslint/core v$VERSION"
else
  {
    echo "Release @accesslint/core v$VERSION"
    echo
    cat
  } | git commit -F -
fi

git push origin HEAD:main
git tag "$TAG"
git push origin "$TAG"

echo "Released $TAG — publish workflow triggered."
