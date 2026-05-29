#!/usr/bin/env node
/**
 * check-resync.cjs — Detect if docs/superpowers/ has changed since the last memory sync.
 *
 * Usage:
 *   node scripts/check-resync.cjs [--repo-root <path>]
 *
 * Root resolution (in order):
 *   1. --repo-root flag
 *   2. git rev-parse --show-toplevel (git root of cwd)
 *   3. If not in a git repo → {dirty: false, docsExists: false, repoNotFound: true}
 *
 * Dirty detection (IMPORTANT — read before changing):
 *   Dirty is computed by comparing the CONTENT of the canonical artifact set
 *   (spec/prd/qa/adrs per feature) on disk against the same content recorded in
 *   the manifest's synced_features. This is the SAME hashing compute-inventory
 *   uses, imported from lib/artifact-hash.cjs, so the two can never disagree.
 *
 *   It is NOT a git tree hash and NOT a commit sha. Do not reconstruct it by hand
 *   (e.g. `git rev-parse HEAD:docs/superpowers` or `git log -1`); those measure
 *   unrelated things (a tree object / the last commit touching the whole dir,
 *   including non-artifact files like plans/) and will report spurious changes.
 *   Only this script is authoritative for the dirty decision.
 *
 * Exit codes:
 *   0 — success (including "nothing changed" or "docs don't exist")
 *   1 — usage error or unrecoverable runtime failure
 *
 * Output (stdout): JSON
 * Diagnostics (stderr): warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  computeDiskMap,
  deriveManifestMap,
  mapsEqual,
  fingerprintOfMap,
} = require('./lib/artifact-hash.cjs');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const HELP = `
check-resync.cjs — Detect if docs/superpowers/ has changed since last memory sync.

Usage:
  node scripts/check-resync.cjs [--repo-root <path>]

Options:
  --repo-root <path>  Explicit path to the repository root (overrides git detection)
  --help              Show this help text and exit 0

Output (JSON to stdout):
  {
    "dirty": boolean,            // true when a re-sync is needed
    "docsExists": boolean,       // false → skip GateResync silently (nothing to sync)
    "memoryExists": boolean,     // false → run pmem init before syncing
    "manifest": {...} | null,    // current manifest content, or null if missing
    "currentArtifactHash": string|null,  // content fingerprint of artifacts on disk
    "hashMethod": "artifact-content"|"none",
    "manifestPath": string,
    "docsPath": string,
    "repoRoot": string,
    "repoNotFound": boolean      // true when no git root and no --repo-root given
  }

Dirty flag is set when ANY of:
  - manifest file does not exist / is unparseable
  - the on-disk artifact content map differs from the manifest's recorded content
    (a feature is new, changed, or deleted)

Dirty detection is content-based over spec/prd/qa/adrs only; commits that touch
plans/ or other non-artifact files never trigger a re-sync, and uncommitted
artifact edits ARE detected.

Exit codes:
  0  success
  1  usage error or unrecoverable failure
`.trimStart();

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

let repoRoot = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo-root' && args[i + 1]) {
    repoRoot = path.resolve(args[++i]);
  }
}

// ─── Git root detection ───────────────────────────────────────────────────────

function detectGitRoot() {
  try {
    const result = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!repoRoot) {
  repoRoot = detectGitRoot();
  if (!repoRoot) {
    const result = {
      dirty: false,
      docsExists: false,
      memoryExists: false,
      manifest: null,
      currentArtifactHash: null,
      hashMethod: 'none',
      manifestPath: null,
      docsPath: null,
      repoRoot: null,
      repoNotFound: true,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(0);
  }
}

const docsPath = path.join(repoRoot, 'docs', 'superpowers');
const manifestPath = path.join(repoRoot, '.memory', 'resync-manifest.json');
const memoryDir = path.join(repoRoot, '.memory');

// docs/superpowers/ doesn't exist → nothing to sync
if (!fs.existsSync(docsPath)) {
  const result = {
    dirty: false,
    docsExists: false,
    memoryExists: fs.existsSync(memoryDir),
    manifest: null,
    currentArtifactHash: null,
    hashMethod: 'none',
    manifestPath,
    docsPath,
    repoRoot,
    repoNotFound: false,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Read manifest
let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Warning: could not parse resync-manifest.json: ${err.message}\n`);
    manifest = null;
  }
}

// Build content maps and compare. dirty == any feature new/changed/deleted.
const diskMap = computeDiskMap(docsPath);
const currentArtifactHash = fingerprintOfMap(diskMap);
const hashMethod = currentArtifactHash === null ? 'none' : 'artifact-content';

let dirty;
if (manifest === null) {
  dirty = true; // no manifest → never synced
} else {
  const manifestMap = deriveManifestMap(manifest);
  dirty = !mapsEqual(diskMap, manifestMap);
}

const result = {
  dirty,
  docsExists: true,
  memoryExists: fs.existsSync(memoryDir),
  manifest,
  currentArtifactHash,
  hashMethod,
  manifestPath,
  docsPath,
  repoRoot,
  repoNotFound: false,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
