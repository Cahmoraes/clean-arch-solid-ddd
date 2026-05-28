#!/usr/bin/env node
/**
 * compute-inventory.cjs — Scan docs/superpowers/ and diff artifacts against the sync manifest.
 *
 * Usage:
 *   node scripts/compute-inventory.cjs [--repo-root <path>] [--manifest-path <path>]
 *
 * Exit codes:
 *   0 — success (including "no features found")
 *   1 — usage error or unrecoverable runtime failure
 *
 * Output (stdout): JSON
 * Diagnostics (stderr): warnings for per-artifact read errors
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const HELP = `
compute-inventory.cjs — Scan docs/superpowers/ and diff artifacts against sync manifest.

Usage:
  node scripts/compute-inventory.cjs [--repo-root <path>] [--manifest-path <path>]

Options:
  --repo-root      <path>  Explicit repository root (overrides git detection)
  --manifest-path  <path>  Explicit manifest path (overrides default .memory/resync-manifest.json)
  --help                   Show this help text and exit 0

Artifact paths per feature (slug = directory name):
  spec:  docs/superpowers/<slug>/specs/<slug>-design.md
  prd:   docs/superpowers/<slug>/prd/prd-<slug>.md
  qa:    docs/superpowers/<slug>/qa/qa-report-<slug>.md
  adrs:  docs/superpowers/<slug>/adrs/*.md  (combined hash of all ADR files, sorted by name)

Output (JSON to stdout):
  {
    "treeHash": string | null,
    "hashMethod": "git" | "stat" | "none",
    "docsPath": string,
    "repoRoot": string,
    "features": Feature[],
    "errors": Error[]
  }

  Feature:
  {
    "slug": string,
    "status": "new" | "changed" | "unchanged" | "deleted",
    "artifacts": {
      "spec":  ArtifactResult,
      "prd":   ArtifactResult,
      "qa":    ArtifactResult,
      "adrs":  AdrsResult
    }
  }

  ArtifactResult:
  {
    "path": string,          // absolute path checked
    "hash": string | null,   // sha256:<hex> or null
    "exists": boolean,
    "readable": boolean,     // false on permission/IO error (exists may still be true)
    "error": string | null   // error message if !readable
  }

  AdrsResult:
  {
    "path": string,          // absolute path to adrs/ directory
    "hash": string | null,   // combined SHA-256 of all .md files sorted by name
    "exists": boolean,       // true if directory exists (even if empty)
    "readable": boolean,
    "files": string[],       // names of .md files found (sorted)
    "error": string | null
  }

  Error:
  {
    "slug": string,
    "artifact": "spec" | "prd" | "qa" | "adrs",
    "error": string
  }

Status semantics:
  "new"       — slug not in manifest's synced_features
  "changed"   — slug in manifest but at least one hash differs (including new adr_hash)
  "unchanged" — slug in manifest and all hashes match
  "deleted"   — slug in manifest but directory no longer exists in docs/superpowers/

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
let manifestPathOverride = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo-root' && args[i + 1]) {
    repoRoot = path.resolve(args[++i]);
  } else if (args[i] === '--manifest-path' && args[i + 1]) {
    manifestPathOverride = path.resolve(args[++i]);
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

// ─── Tree hash (same logic as check-resync.cjs) ───────────────────────────────

function getGitTreeHash(docsPath, root) {
  const relDocs = path.relative(root, docsPath);
  try {
    const result = execFileSync(
      'git',
      ['log', '-1', '--format=%H', '--', relDocs],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: root }
    );
    const hash = result.trim();
    return hash.length > 0 ? hash : null;
  } catch {
    return null;
  }
}

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

// ─── Artifact hashing ─────────────────────────────────────────────────────────

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { hash: null, exists: false, readable: false, error: null };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    return { hash, exists: true, readable: true, error: null };
  } catch (err) {
    // File exists but could not be read (permissions, encoding, etc.)
    return { hash: null, exists: true, readable: false, error: err.message };
  }
}

function hashAdrs(adrsDir) {
  if (!fs.existsSync(adrsDir)) {
    return { hash: null, exists: false, readable: true, files: [], error: null };
  }

  let allEntries;
  try {
    allEntries = fs.readdirSync(adrsDir);
  } catch (err) {
    return { hash: null, exists: true, readable: false, files: [], error: err.message };
  }

  // Only direct .md files (non-recursive, no subdirectories)
  const mdFiles = allEntries
    .filter((name) => {
      if (!name.endsWith('.md')) return false;
      try {
        return !fs.statSync(path.join(adrsDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort(); // sort by filename for determinism

  if (mdFiles.length === 0) {
    return { hash: null, exists: true, readable: true, files: [], error: null };
  }

  const parts = [];
  const readErrors = [];
  for (const name of mdFiles) {
    try {
      const content = fs.readFileSync(path.join(adrsDir, name), 'utf8');
      // Use "name\ncontent" per file so filename changes also affect the hash
      parts.push(`${name}\n${content}`);
    } catch (err) {
      readErrors.push(`${name}: ${err.message}`);
      process.stderr.write(`Warning: could not read ADR ${name}: ${err.message}\n`);
    }
  }

  if (parts.length === 0) {
    return {
      hash: null,
      exists: true,
      readable: false,
      files: mdFiles,
      error: `all ADR files unreadable: ${readErrors.join('; ')}`,
    };
  }

  const combined = parts.join('\n---\n');
  const hash = 'sha256:' + crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
  return { hash, exists: true, readable: true, files: mdFiles, error: null };
}

// ─── Manifest hash normalization ──────────────────────────────────────────────
//
// Older manifests may lack adr_hash. Normalize missing fields to null so that
// a feature with no ADRs and no adr_hash entry does NOT get classified as changed.

function normalizeManifestEntry(entry) {
  if (!entry || typeof entry !== 'object') return { spec_hash: null, prd_hash: null, qa_hash: null, adr_hash: null };
  return {
    spec_hash: entry.spec_hash ?? null,
    prd_hash: entry.prd_hash ?? null,
    qa_hash: entry.qa_hash ?? null,
    adr_hash: entry.adr_hash ?? null,
  };
}

// Strip the optional "sha256:" prefix so legacy manifests (bare hex) and current
// manifests (prefixed) compare equal when their content is identical. Without this,
// every legacy-format entry is falsely classified as "changed", defeating the
// manifest-based skip and forcing a full re-process on every sync.
function bareDigest(hash) {
  if (hash === null || hash === undefined) return null;
  return String(hash).replace(/^sha256:/, '');
}

// ─── Feature classification ───────────────────────────────────────────────────

function classifyFeature(slug, artifacts, manifestEntry) {
  if (!manifestEntry) return 'new';

  const norm = normalizeManifestEntry(manifestEntry);

  const specChanged = bareDigest(artifacts.spec.hash) !== bareDigest(norm.spec_hash);
  const prdChanged = bareDigest(artifacts.prd.hash) !== bareDigest(norm.prd_hash);
  const qaChanged = bareDigest(artifacts.qa.hash) !== bareDigest(norm.qa_hash);
  const adrsChanged = bareDigest(artifacts.adrs.hash) !== bareDigest(norm.adr_hash);

  return specChanged || prdChanged || qaChanged || adrsChanged ? 'changed' : 'unchanged';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!repoRoot) {
  repoRoot = detectGitRoot();
  if (!repoRoot) {
    process.stderr.write('Warning: no git root found and no --repo-root given; using cwd\n');
    repoRoot = process.cwd();
  }
}

const docsPath = path.join(repoRoot, 'docs', 'superpowers');
const manifestPath = manifestPathOverride || path.join(repoRoot, '.memory', 'resync-manifest.json');

// docs/superpowers/ doesn't exist
if (!fs.existsSync(docsPath)) {
  const result = {
    treeHash: null,
    hashMethod: 'none',
    docsPath,
    repoRoot,
    features: [],
    errors: [],
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
  }
}

const synced = (manifest && manifest.synced_features) ? manifest.synced_features : {};

// Get tree hash
let treeHash = getGitTreeHash(docsPath, repoRoot);
let hashMethod = 'git';
if (treeHash === null) {
  process.stderr.write('Warning: git not available or path not yet committed, using stat fingerprint\n');
  treeHash = getStatTreeHash(docsPath);
  hashMethod = treeHash ? 'stat' : 'none';
}

// List feature directories
let slugDirs;
try {
  slugDirs = fs.readdirSync(docsPath)
    .filter((name) => {
      try {
        return fs.statSync(path.join(docsPath, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
} catch (err) {
  process.stderr.write(`Error: could not read docs/superpowers/: ${err.message}\n`);
  process.exit(1);
}

const features = [];
const errors = [];
const seenSlugs = new Set();

for (const slug of slugDirs) {
  seenSlugs.add(slug);
  const slugDir = path.join(docsPath, slug);

  const specPath = path.join(slugDir, 'specs', `${slug}-design.md`);
  const prdPath = path.join(slugDir, 'prd', `prd-${slug}.md`);
  const qaPath = path.join(slugDir, 'qa', `qa-report-${slug}.md`);
  const adrsDir = path.join(slugDir, 'adrs');

  const specResult = hashFile(specPath);
  const prdResult = hashFile(prdPath);
  const qaResult = hashFile(qaPath);
  const adrsResult = hashAdrs(adrsDir);

  // Collect read errors for reporting
  if (!specResult.readable && specResult.exists) {
    errors.push({ slug, artifact: 'spec', error: specResult.error });
  }
  if (!prdResult.readable && prdResult.exists) {
    errors.push({ slug, artifact: 'prd', error: prdResult.error });
  }
  if (!qaResult.readable && qaResult.exists) {
    errors.push({ slug, artifact: 'qa', error: qaResult.error });
  }
  if (!adrsResult.readable && adrsResult.exists) {
    errors.push({ slug, artifact: 'adrs', error: adrsResult.error });
  }

  const artifacts = {
    spec: { path: specPath, ...specResult },
    prd: { path: prdPath, ...prdResult },
    qa: { path: qaPath, ...qaResult },
    adrs: { path: adrsDir, ...adrsResult },
  };

  const status = classifyFeature(slug, artifacts, synced[slug]);

  features.push({ slug, status, artifacts });
}

// Detect deleted features (in manifest but no longer on filesystem)
for (const slug of Object.keys(synced)) {
  if (!seenSlugs.has(slug)) {
    features.push({
      slug,
      status: 'deleted',
      artifacts: {
        spec: { path: path.join(docsPath, slug, 'specs', `${slug}-design.md`), hash: null, exists: false, readable: false, error: null },
        prd: { path: path.join(docsPath, slug, 'prd', `prd-${slug}.md`), hash: null, exists: false, readable: false, error: null },
        qa: { path: path.join(docsPath, slug, 'qa', `qa-report-${slug}.md`), hash: null, exists: false, readable: false, error: null },
        adrs: { path: path.join(docsPath, slug, 'adrs'), hash: null, exists: false, readable: false, files: [], error: null },
      },
    });
  }
}

const result = {
  treeHash,
  hashMethod,
  docsPath,
  repoRoot,
  features,
  errors,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
process.exit(0);
