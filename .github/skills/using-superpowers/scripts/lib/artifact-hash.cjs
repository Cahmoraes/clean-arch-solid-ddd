'use strict';

/**
 * artifact-hash.cjs — Single source of truth for hashing the canonical superpowers
 * artifact set (spec / prd / qa / adrs) under docs/superpowers/<slug>/.
 *
 * Both check-resync.cjs (dirty detection) and compute-inventory.cjs (per-feature
 * diff) import from here so they can NEVER drift apart. Drift between those two
 * computations is exactly what produced the original false-positive: dirty
 * detection used `git log -1` (a COMMIT sha of the whole dir, including plans/)
 * while the per-feature diff hashed artifact CONTENT — two unrelated namespaces.
 *
 * The fingerprint is content-addressed over the working tree:
 *   - reads the actual files (catches uncommitted edits),
 *   - ignores everything outside the canonical artifact set (plans/, prompts/, …),
 *   - is independent of git history (commit sha churn never triggers a false sync).
 *
 * Artifact paths per feature (slug = directory name):
 *   spec:  docs/superpowers/<slug>/specs/<slug>-design.md
 *   prd:   docs/superpowers/<slug>/prd/prd-<slug>.md
 *   qa:    docs/superpowers/<slug>/qa/qa-report-<slug>.md
 *   adrs:  docs/superpowers/<slug>/adrs/*.md  (combined, sorted by filename)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Single-file hashing ──────────────────────────────────────────────────────

function hashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { hash: null, exists: false, readable: false, error: null };
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = 'sha256:' + crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    return { hash, exists: true, readable: true, error: null };
  } catch (err) {
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

  const mdFiles = allEntries
    .filter((name) => {
      if (!name.endsWith('.md')) return false;
      try {
        return !fs.statSync(path.join(adrsDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();

  if (mdFiles.length === 0) {
    return { hash: null, exists: true, readable: true, files: [], error: null };
  }

  const parts = [];
  const readErrors = [];
  for (const name of mdFiles) {
    try {
      const content = fs.readFileSync(path.join(adrsDir, name), 'utf8');
      parts.push(`${name}\n${content}`);
    } catch (err) {
      readErrors.push(`${name}: ${err.message}`);
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

// ─── Hash normalization ─────────────────────────────────────────────────────
//
// Strip the optional "sha256:" prefix so legacy manifests (bare hex) and current
// manifests (prefixed) compare equal when their content is identical.

function bareDigest(hash) {
  if (hash === null || hash === undefined) return null;
  return String(hash).replace(/^sha256:/, '');
}

// Older manifests may lack adr_hash. Normalize missing fields to null so a feature
// with no ADRs and no adr_hash entry does NOT get classified as changed.
function normalizeManifestEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { spec_hash: null, prd_hash: null, qa_hash: null, adr_hash: null };
  }
  return {
    spec_hash: entry.spec_hash ?? null,
    prd_hash: entry.prd_hash ?? null,
    qa_hash: entry.qa_hash ?? null,
    adr_hash: entry.adr_hash ?? null,
  };
}

// ─── Feature artifact hashing ─────────────────────────────────────────────────

/**
 * Hash all four canonical artifacts for a single feature slug.
 * Returns { spec, prd, qa, adrs } ArtifactResult objects (same shape both
 * consumers expect).
 */
function hashFeatureArtifacts(docsPath, slug) {
  const slugDir = path.join(docsPath, slug);
  const specPath = path.join(slugDir, 'specs', `${slug}-design.md`);
  const prdPath = path.join(slugDir, 'prd', `prd-${slug}.md`);
  const qaPath = path.join(slugDir, 'qa', `qa-report-${slug}.md`);
  const adrsDir = path.join(slugDir, 'adrs');

  return {
    spec: { path: specPath, ...hashFile(specPath) },
    prd: { path: prdPath, ...hashFile(prdPath) },
    qa: { path: qaPath, ...hashFile(qaPath) },
    adrs: { path: adrsDir, ...hashAdrs(adrsDir) },
  };
}

// ─── Slug discovery ───────────────────────────────────────────────────────────

function listFeatureSlugs(docsPath) {
  try {
    return fs
      .readdirSync(docsPath)
      .filter((name) => {
        try {
          return fs.statSync(path.join(docsPath, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

// ─── Content maps for dirty detection ──────────────────────────────────────────
//
// A "content map" is { <slug>: { spec, prd, qa, adr } } using bare digests
// (prefix-stripped). Comparing the disk map against the manifest-derived map is
// exactly the union of new/changed/deleted features — i.e. precisely when a
// re-sync is needed. There is no separate top-level hash to drift or to
// reconstruct by hand.

/** Build the content map from the current working tree. */
function computeDiskMap(docsPath) {
  const map = {};
  if (!fs.existsSync(docsPath)) return map;
  for (const slug of listFeatureSlugs(docsPath)) {
    const a = hashFeatureArtifacts(docsPath, slug);
    map[slug] = {
      spec: bareDigest(a.spec.hash),
      prd: bareDigest(a.prd.hash),
      qa: bareDigest(a.qa.hash),
      adr: bareDigest(a.adrs.hash),
    };
  }
  return map;
}

/** Build the content map from a manifest's synced_features. */
function deriveManifestMap(manifest) {
  const map = {};
  const synced = manifest && manifest.synced_features ? manifest.synced_features : {};
  for (const [slug, entry] of Object.entries(synced)) {
    const norm = normalizeManifestEntry(entry);
    map[slug] = {
      spec: bareDigest(norm.spec_hash),
      prd: bareDigest(norm.prd_hash),
      qa: bareDigest(norm.qa_hash),
      adr: bareDigest(norm.adr_hash),
    };
  }
  return map;
}

function entryEqual(a, b) {
  const ea = a || {};
  const eb = b || {};
  return (
    (ea.spec ?? null) === (eb.spec ?? null) &&
    (ea.prd ?? null) === (eb.prd ?? null) &&
    (ea.qa ?? null) === (eb.qa ?? null) &&
    (ea.adr ?? null) === (eb.adr ?? null)
  );
}

/** Deep-equal two content maps over the union of their slugs. */
function mapsEqual(a, b) {
  const slugs = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const slug of slugs) {
    if (!entryEqual(a[slug], b[slug])) return false;
  }
  return true;
}

/**
 * Stable string fingerprint of a content map — sorted `slug|spec|prd|qa|adr`
 * lines hashed with SHA-256. Stored in the manifest for observability; dirty
 * detection itself uses mapsEqual (no reliance on a stored aggregate).
 */
function fingerprintOfMap(map) {
  const slugs = Object.keys(map).sort();
  if (slugs.length === 0) return null;
  const lines = slugs.map((slug) => {
    const e = map[slug] || {};
    return `${slug}|${e.spec ?? ''}|${e.prd ?? ''}|${e.qa ?? ''}|${e.adr ?? ''}`;
  });
  return 'sha256:' + crypto.createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
}

module.exports = {
  hashFile,
  hashAdrs,
  bareDigest,
  normalizeManifestEntry,
  hashFeatureArtifacts,
  listFeatureSlugs,
  computeDiskMap,
  deriveManifestMap,
  mapsEqual,
  fingerprintOfMap,
};
