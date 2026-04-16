#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:?Usage: scripts/release.sh <version> (e.g. 0.3.0)}"

# Strip leading 'v' if provided
VERSION="${VERSION#v}"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: '$VERSION' is not a valid semver version" >&2
  exit 1
fi

# Ensure working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

# Update package.json version
npm version "$VERSION" --no-git-tag-version

# Commit, tag, push
git add package.json package-lock.json
git commit -m "Bump version to $VERSION"
git tag "v$VERSION"
git push
git push origin "v$VERSION"

echo "Released v$VERSION — publish workflow triggered."
