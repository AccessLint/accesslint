#!/usr/bin/env node
/**
 * Rewrite a package's `workspace:*` dependencies to the exact versions in the
 * monorepo, then refuse to publish if the result would install two different
 * copies of an @accesslint package.
 *
 * Usage: node scripts/prepare-publish.mjs <packageDir> [--skip-registry-check]
 *
 * Two invariants, both learned the hard way (issues #4 and skills#8):
 *
 * 1. Exact versions, never ranges. On a 0.x version a caret pins the minor, so
 *    `^0.10.0` can never reach 0.11.x. @accesslint/mcp shipped `cli: ^0.10.0`
 *    and stayed stuck on the one CLI release with the Windows path bug even
 *    after the fix went out in 0.11.1.
 *
 * 2. No diamonds. If we pin `core: X` and also pin a sibling that pins
 *    `core: Y`, npm installs both copies. The engine that runs the audit is
 *    then a different build from the one supplying rule metadata, which
 *    silently drops fields and leaks rules past allow-lists. Publishing in
 *    dependency order (core, then cli, then mcp) is what keeps this true, and
 *    this check is what makes forgetting it a build failure instead of a bug
 *    report.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SECTIONS = ["dependencies", "devDependencies", "peerDependencies"];
/** Sections a consumer actually installs, and so the ones the invariants cover. */
const PUBLISHED_SECTIONS = ["dependencies", "peerDependencies"];
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const args = process.argv.slice(2);
const skipRegistryCheck = args.includes("--skip-registry-check");
const packageDir = args.find((a) => !a.startsWith("--"));

if (!packageDir) {
  console.error("Usage: node scripts/prepare-publish.mjs <packageDir> [--skip-registry-check]");
  process.exit(2);
}

const repoRoot = path.resolve(import.meta.dirname, "..");
const pkgPath = path.join(repoRoot, packageDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

/** Local version of a workspace sibling, resolved by its directory name. */
function localVersion(depName) {
  const dir = depName.split("/")[1];
  const siblingPath = path.join(repoRoot, dir, "package.json");
  const sibling = JSON.parse(readFileSync(siblingPath, "utf8"));
  if (!sibling.version) throw new Error(`${siblingPath} has no version`);
  return sibling.version;
}

for (const section of SECTIONS) {
  for (const [name, range] of Object.entries(pkg[section] ?? {})) {
    if (range === "workspace:*") pkg[section][name] = localVersion(name);
  }
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Pinned workspace deps in ${packageDir}/package.json`);

const failures = [];

for (const section of PUBLISHED_SECTIONS) {
  for (const [name, range] of Object.entries(pkg[section] ?? {})) {
    if (!name.startsWith("@accesslint/")) continue;
    if (!EXACT_VERSION.test(range)) {
      failures.push(
        `${section}.${name} is "${range}", not an exact version. ` +
          `On 0.x a caret pins the minor, so fixes in later minors never reach consumers.`,
      );
    }
  }
}

/** Published manifest of a package at an exact version, or null if unpublished. */
function publishedDependencies(name, version) {
  try {
    const raw = execFileSync("npm", ["view", `${name}@${version}`, "dependencies", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return raw === "" ? {} : JSON.parse(raw);
  } catch {
    return null;
  }
}

if (skipRegistryCheck) {
  console.log("Skipping registry diamond check (--skip-registry-check)");
} else {
  const ours = pkg.dependencies ?? {};
  for (const [name, version] of Object.entries(ours)) {
    if (!name.startsWith("@accesslint/")) continue;
    const theirs = publishedDependencies(name, version);
    if (theirs === null) {
      failures.push(
        `${name}@${version} is not published. Publish it before ${pkg.name}, ` +
          `or consumers will not be able to install this release.`,
      );
      continue;
    }
    for (const [shared, theirVersion] of Object.entries(theirs)) {
      if (!shared.startsWith("@accesslint/")) continue;
      const ourVersion = ours[shared];
      if (ourVersion && ourVersion !== theirVersion) {
        failures.push(
          `${pkg.name} pins ${shared}@${ourVersion} but ${name}@${version} pins ` +
            `${shared}@${theirVersion}. npm would install both copies. ` +
            `Release ${name} against ${shared}@${ourVersion} first.`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\nRefusing to publish ${pkg.name}:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error("");
  process.exit(1);
}

console.log(`${pkg.name} is safe to publish`);
