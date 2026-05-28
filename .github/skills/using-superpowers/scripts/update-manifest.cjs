#!/usr/bin/env node
/**
 * update-manifest.cjs — Write an updated resync-manifest.json after a successful sync.
 *
 * Usage:
 *   echo '<json>' | node scripts/update-manifest.cjs [--repo-root <path>]
 *   node scripts/update-manifest.cjs [--repo-root <path>] --input-file <path>
 *
 * Reads the update payload from stdin (preferred) or --input-file.
 *
 * Input JSON schema:
 *   {
 *     "treeHash":       string | null,    // current tree hash from compute-inventory
 *     "hashMethod":     "git"|"stat"|"none",
 *     "syncedFeatures": {                 // only new/changed features synced this run
 *       "<slug>": {
 *         "spec_hash": string | null,
 *         "prd_hash":  string | null,
 *         "qa_hash":   string | null,
 *         "adr_hash":  string | null
 *       }
 *     },
 *     "deletedSlugs":   string[]          // slugs to remove from the manifest
 *   }
 *
 * Merge semantics:
 *   - All existing synced_features entries are preserved
 *   - deletedSlugs entries are removed
 *   - syncedFeatures entries are overlaid (overwrite existing slugs)
 *
 * Exit codes:
 *   0 — success
 *   1 — usage error, unreadable input, or write failure
 *
 * Output (stdout): JSON
 * Diagnostics (stderr): warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const HELP = `
update-manifest.cjs — Write updated resync-manifest.json after a successful sync.

Usage:
  echo '<json>' | node scripts/update-manifest.cjs [--repo-root <path>]
  node scripts/update-manifest.cjs [--repo-root <path>] --input-file <path>

Options:
  --repo-root   <path>  Explicit repository root (overrides git detection)
  --input-file  <path>  Read input JSON from file instead of stdin
  --help                Show this help text and exit 0

Input JSON (from stdin or --input-file):
  {
    "treeHash":       string|null,
    "hashMethod":     "git"|"stat"|"none",
    "syncedFeatures": { "<slug>": { "spec_hash", "prd_hash", "qa_hash", "adr_hash" } },
    "deletedSlugs":   string[]
  }

Output (JSON to stdout):
  {
    "written":   boolean,
    "path":      string,
    "timestamp": string
  }

Exit codes:
  0  success
  1  usage error or write failure
`.trimStart();

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}

let repoRoot = null;
let inputFilePath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo-root' && args[i + 1]) {
    repoRoot = path.resolve(args[++i]);
  } else if (args[i] === '--input-file' && args[i + 1]) {
    inputFilePath = path.resolve(args[++i]);
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

// ─── Read input JSON ─────────────────────────────────────────────────────────

function readStdin() {
  // Synchronously drain stdin
  try {
    return fs.readFileSync('/dev/stdin', 'utf8');
  } catch {
    // Fallback for environments where /dev/stdin isn't available
    return '';
  }
}

let inputRaw;
if (inputFilePath) {
  try {
    inputRaw = fs.readFileSync(inputFilePath, 'utf8');
  } catch (err) {
    process.stderr.write(`Error: could not read --input-file: ${err.message}\n`);
    process.exit(1);
  }
} else {
  inputRaw = readStdin();
}

if (!inputRaw.trim()) {
  process.stderr.write('Error: no input provided. Pass JSON via stdin or --input-file.\n');
  process.stderr.write('Run with --help for usage.\n');
  process.exit(1);
}

let input;
try {
  input = JSON.parse(inputRaw);
} catch (err) {
  process.stderr.write(`Error: invalid JSON input: ${err.message}\n`);
  process.exit(1);
}

// Validate required fields
if (typeof input !== 'object' || input === null) {
  process.stderr.write('Error: input must be a JSON object\n');
  process.exit(1);
}

const treeHash = input.treeHash ?? null;
const hashMethod = input.hashMethod ?? 'none';
const syncedFeatures = (input.syncedFeatures && typeof input.syncedFeatures === 'object') ? input.syncedFeatures : {};
const deletedSlugs = Array.isArray(input.deletedSlugs) ? input.deletedSlugs : [];

// ─── Resolve paths ────────────────────────────────────────────────────────────

if (!repoRoot) {
  repoRoot = detectGitRoot();
  if (!repoRoot) {
    process.stderr.write('Warning: no git root found, using cwd as repo root\n');
    repoRoot = process.cwd();
  }
}

const memoryDir = path.join(repoRoot, '.memory');
const manifestPath = path.join(memoryDir, 'resync-manifest.json');

// ─── Read existing manifest ───────────────────────────────────────────────────

let existingManifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    existingManifest = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`Warning: could not parse existing manifest, starting fresh: ${err.message}\n`);
  }
}

const existingSynced = (existingManifest && existingManifest.synced_features) ? existingManifest.synced_features : {};

// Canonicalize every stored hash to the "sha256:<hex>" form. This migrates legacy
// bare-hex entries on the next write, so the manifest stops mixing formats — which
// is what made compute-inventory's strict comparison misfire in the first place.
function canonicalHash(hash) {
  if (hash === null || hash === undefined) return null;
  const str = String(hash);
  return str.startsWith('sha256:') ? str : `sha256:${str}`;
}

function canonicalizeEntry(entry) {
  const e = (entry && typeof entry === 'object') ? entry : {};
  return {
    spec_hash: canonicalHash(e.spec_hash ?? null),
    prd_hash: canonicalHash(e.prd_hash ?? null),
    qa_hash: canonicalHash(e.qa_hash ?? null),
    adr_hash: canonicalHash(e.adr_hash ?? null),
  };
}

// ─── Merge ────────────────────────────────────────────────────────────────────
//
// 1. Start with all existing entries (canonicalized)
// 2. Remove deleted slugs
// 3. Overlay new/changed entries (canonicalized)

const mergedSynced = {};
for (const [slug, entry] of Object.entries(existingSynced)) {
  mergedSynced[slug] = canonicalizeEntry(entry);
}

for (const slug of deletedSlugs) {
  delete mergedSynced[slug];
}

for (const [slug, entry] of Object.entries(syncedFeatures)) {
  mergedSynced[slug] = canonicalizeEntry(entry);
}

const timestamp = new Date().toISOString();

const newManifest = {
  last_synced_at: timestamp,
  last_synced_tree_hash: treeHash,
  last_synced_hash_method: hashMethod,
  synced_features: mergedSynced,
};

// ─── Write atomically ─────────────────────────────────────────────────────────

// Ensure .memory/ directory exists
try {
  fs.mkdirSync(memoryDir, { recursive: true });
} catch (err) {
  process.stderr.write(`Error: could not create .memory/ directory: ${err.message}\n`);
  process.exit(1);
}

const tmpPath = manifestPath + '.tmp.' + process.pid;
const manifestJson = JSON.stringify(newManifest, null, 2) + '\n';

try {
  fs.writeFileSync(tmpPath, manifestJson, 'utf8');
  fs.renameSync(tmpPath, manifestPath);
} catch (err) {
  // Clean up temp file if rename failed
  try { fs.unlinkSync(tmpPath); } catch {}
  process.stderr.write(`Error: could not write manifest: ${err.message}\n`);
  process.exit(1);
}

const result = {
  written: true,
  path: manifestPath,
  timestamp,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
