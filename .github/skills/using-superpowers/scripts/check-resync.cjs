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
const crypto = require('crypto');
const { execFileSync } = require('child_process');

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
    "currentTreeHash": string|null,
    "hashMethod": "git"|"stat"|"none",
    "manifestPath": string,
    "docsPath": string,
    "repoRoot": string,
    "repoNotFound": boolean      // true when no git root and no --repo-root given
  }

Dirty flag is set when ANY of:
  - manifest file does not exist
  - manifest has no last_synced_tree_hash
  - manifest hash method differs from current method (triggers one-time upgrade sync)
  - current tree hash differs from manifest's last_synced_tree_hash

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

// ─── Tree hash via git ────────────────────────────────────────────────────────

function getGitTreeHash(docsPath, root) {
  // Use the relative path from repo root to make the command portable.
  const relDocs = path.relative(root, docsPath);
  try {
    const result = execFileSync(
      'git',
      ['log', '-1', '--format=%H', '--', relDocs],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: root }
    );
    const hash = result.trim();
    // Empty string means no commits have touched the path yet.
    return hash.length > 0 ? hash : null;
  } catch {
    return null;
  }
}

// ─── Tree hash via stat (fallback when git is unavailable) ───────────────────
//
// Walk docs/superpowers/ recursively, collect (relPath, mtimeMs, size) tuples
// sorted by relative path, then SHA-256 of the concatenated string.
// Using mtimeMs (float ms) + size gives better precision than mtime-seconds alone.

function walkDir(dir, base, entries) {
  let items;
  try {
    items = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const item of items.sort()) {
    const full = path.join(dir, item);
    let stat;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    const rel = path.relative(base, full);
    if (stat.isDirectory()) {
      walkDir(full, base, entries);
    } else {
      entries.push(`${rel}:${stat.mtimeMs}:${stat.size}`);
    }
  }
}

function getStatTreeHash(docsPath) {
  const entries = [];
  walkDir(docsPath, docsPath, entries);
  if (entries.length === 0) return null;
  const combined = entries.join('\n');
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
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
      currentTreeHash: null,
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
    currentTreeHash: null,
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

// Get current tree hash
let currentTreeHash = getGitTreeHash(docsPath, repoRoot);
let hashMethod = 'git';

if (currentTreeHash === null) {
  // git not available or path has no commits yet — fall back to stat fingerprint
  process.stderr.write('Warning: git not available or path not yet committed, using stat fingerprint\n');
  currentTreeHash = getStatTreeHash(docsPath);
  hashMethod = 'stat';
}

// Determine dirty state
function isDirty() {
  if (manifest === null) return true;
  if (!manifest.last_synced_tree_hash) return true;
  // Hash method mismatch → one-time upgrade sync (conservative)
  if (manifest.last_synced_hash_method && manifest.last_synced_hash_method !== hashMethod) {
    process.stderr.write(
      `Warning: hash method changed (${manifest.last_synced_hash_method} → ${hashMethod}), marking dirty for upgrade sync\n`
    );
    return true;
  }
  if (currentTreeHash === null) return false; // empty docs dir, no fingerprint
  return manifest.last_synced_tree_hash !== currentTreeHash;
}

const dirty = isDirty();

const result = {
  dirty,
  docsExists: true,
  memoryExists: fs.existsSync(memoryDir),
  manifest,
  currentTreeHash,
  hashMethod,
  manifestPath,
  docsPath,
  repoRoot,
  repoNotFound: false,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
