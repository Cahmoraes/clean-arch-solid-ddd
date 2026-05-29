'use strict'

/**
 * Regression tests for the GateResync deterministic scripts.
 *
 * Run with: node --test .github/skills/using-superpowers/scripts/__tests__/
 *
 * Covers:
 *  - compute-inventory.cjs: hash-format-agnostic classification (Defeito 1).
 *      A feature whose stored hash is bare (legacy, no "sha256:" prefix) but whose
 *      current content matches must classify as "unchanged", not "changed".
 *  - update-manifest.cjs: hashes converge to the canonical "sha256:" form so the
 *      manifest stops mixing formats.
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')

const SCRIPTS_DIR = path.resolve(__dirname, '..')
const COMPUTE = path.join(SCRIPTS_DIR, 'compute-inventory.cjs')
const UPDATE = path.join(SCRIPTS_DIR, 'update-manifest.cjs')
const CHECK = path.join(SCRIPTS_DIR, 'check-resync.cjs')

function mkRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resync-test-'))
  fs.mkdirSync(path.join(root, '.memory'), { recursive: true })
  return root
}

function writeSpec(root, slug, content) {
  const dir = path.join(root, 'docs', 'superpowers', slug, 'specs')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${slug}-design.md`), content, 'utf8')
}

function bareHash(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

function writeManifest(root, syncedFeatures) {
  fs.writeFileSync(
    path.join(root, '.memory', 'resync-manifest.json'),
    JSON.stringify({
      last_synced_at: '2026-01-01T00:00:00Z',
      last_synced_tree_hash: 'deadbeef',
      last_synced_hash_method: 'git',
      synced_features: syncedFeatures,
    }),
    'utf8',
  )
}

function runCompute(root) {
  const out = execFileSync('node', [COMPUTE, '--repo-root', root], { encoding: 'utf8' })
  return JSON.parse(out)
}

function runCheck(root) {
  const out = execFileSync('node', [CHECK, '--repo-root', root], { encoding: 'utf8' })
  return JSON.parse(out)
}

function writeFileAt(root, relParts, content) {
  const dir = path.join(root, ...relParts.slice(0, -1))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(root, ...relParts), content, 'utf8')
}

function featureBySlug(result, slug) {
  return result.features.find((f) => f.slug === slug)
}

test('compute-inventory: legacy bare hash matching content classifies as unchanged', () => {
  const root = mkRepo()
  try {
    const content = '# Design\n\nSome stable spec content.\n'
    writeSpec(root, 'legacy-feat', content)
    // Manifest stores the hash WITHOUT the "sha256:" prefix (legacy format).
    writeManifest(root, {
      'legacy-feat': { spec_hash: bareHash(content), prd_hash: null, qa_hash: null },
    })
    const result = runCompute(root)
    const feat = featureBySlug(result, 'legacy-feat')
    assert.equal(feat.status, 'unchanged', 'bare-hash match must be unchanged, not changed')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('compute-inventory: prefixed hash matching content classifies as unchanged', () => {
  const root = mkRepo()
  try {
    const content = '# Design\n\nPrefixed spec content.\n'
    writeSpec(root, 'modern-feat', content)
    writeManifest(root, {
      'modern-feat': { spec_hash: `sha256:${bareHash(content)}`, prd_hash: null, qa_hash: null },
    })
    const result = runCompute(root)
    assert.equal(featureBySlug(result, 'modern-feat').status, 'unchanged')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('compute-inventory: genuinely changed content still classifies as changed', () => {
  const root = mkRepo()
  try {
    writeSpec(root, 'edited-feat', '# Design\n\nNEW content.\n')
    // Manifest has a bare hash of DIFFERENT (old) content.
    writeManifest(root, {
      'edited-feat': { spec_hash: bareHash('# Design\n\nOLD content.\n'), prd_hash: null, qa_hash: null },
    })
    const result = runCompute(root)
    assert.equal(featureBySlug(result, 'edited-feat').status, 'changed')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('update-manifest: preserved legacy bare hashes converge to canonical sha256: form', () => {
  const root = mkRepo()
  try {
    writeManifest(root, {
      'old-feat': { spec_hash: bareHash('whatever'), prd_hash: null, qa_hash: null },
    })
    const input = JSON.stringify({
      treeHash: 'newtree',
      hashMethod: 'git',
      syncedFeatures: {
        'new-feat': { spec_hash: 'sha256:abc123', prd_hash: null, qa_hash: null, adr_hash: null },
      },
      deletedSlugs: [],
    })
    const inputFile = path.join(root, 'update-input.json')
    fs.writeFileSync(inputFile, input, 'utf8')
    execFileSync('node', [UPDATE, '--repo-root', root, '--input-file', inputFile], { encoding: 'utf8' })
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, '.memory', 'resync-manifest.json'), 'utf8'),
    )
    assert.ok(
      manifest.synced_features['old-feat'].spec_hash.startsWith('sha256:'),
      'preserved legacy entry must be canonicalized to sha256: form',
    )
    assert.equal(manifest.synced_features['new-feat'].spec_hash, 'sha256:abc123')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

// ─── check-resync: content-based dirty detection (the false-positive fix) ─────

test('check-resync: manifest matching disk content is NOT dirty (regression: false positive)', () => {
  // The original bug compared a git commit-sha ("tree hash") that diverged from
  // the content the manifest tracked, flipping dirty:true even though every
  // artifact was unchanged. With content-based detection this must be clean —
  // even when the manifest carries a stale legacy tree-hash + "git" method.
  const root = mkRepo()
  try {
    const content = '# Design\n\nStable content.\n'
    writeSpec(root, 'feat-a', content)
    writeManifest(root, {
      'feat-a': { spec_hash: bareHash(content), prd_hash: null, qa_hash: null },
    })
    const result = runCheck(root)
    assert.equal(result.dirty, false, 'matching content must not be dirty')
    assert.equal(result.hashMethod, 'artifact-content')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync: a commit/file outside the canonical artifact set does NOT trigger dirty', () => {
  // plans/, prompts/, etc. are not part of the tracked set. Adding one must not
  // mark the memory dirty (the old git-log marker would have flipped here).
  const root = mkRepo()
  try {
    const content = '# Design\n\nStable content.\n'
    writeSpec(root, 'feat-b', content)
    writeManifest(root, {
      'feat-b': { spec_hash: `sha256:${bareHash(content)}`, prd_hash: null, qa_hash: null },
    })
    writeFileAt(root, ['docs', 'superpowers', 'feat-b', 'plans', 'task-01.md'], '# Task\n')
    const result = runCheck(root)
    assert.equal(result.dirty, false, 'non-artifact files must not affect dirty')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync: edited artifact content IS dirty (no false negative)', () => {
  const root = mkRepo()
  try {
    writeSpec(root, 'feat-c', '# Design\n\nNEW content.\n')
    writeManifest(root, {
      'feat-c': { spec_hash: bareHash('# Design\n\nOLD content.\n'), prd_hash: null, qa_hash: null },
    })
    assert.equal(runCheck(root).dirty, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync: a new feature on disk IS dirty', () => {
  const root = mkRepo()
  try {
    writeSpec(root, 'feat-known', 'x')
    writeSpec(root, 'feat-new', 'y')
    writeManifest(root, {
      'feat-known': { spec_hash: bareHash('x'), prd_hash: null, qa_hash: null },
    })
    assert.equal(runCheck(root).dirty, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync: a feature deleted from disk IS dirty', () => {
  // docs/superpowers/ still exists (kept-feat is present); only gone-feat's
  // directory was removed while it remains in the manifest.
  const root = mkRepo()
  try {
    writeSpec(root, 'kept-feat', 'kept')
    writeManifest(root, {
      'kept-feat': { spec_hash: bareHash('kept'), prd_hash: null, qa_hash: null },
      'gone-feat': { spec_hash: bareHash('whatever'), prd_hash: null, qa_hash: null },
    })
    assert.equal(runCheck(root).dirty, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync: no manifest at all IS dirty', () => {
  const root = mkRepo()
  try {
    writeSpec(root, 'feat-d', 'content')
    assert.equal(runCheck(root).dirty, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('check-resync ↔ compute-inventory: round-trip via update-manifest converges to not-dirty', () => {
  // Computing the inventory, writing the manifest with those hashes, then
  // re-checking must report clean — proving the two scripts share one hash.
  const root = mkRepo()
  try {
    writeSpec(root, 'rt-feat', '# Design\n\nRound trip.\n')
    const inv = runCompute(root)
    const feat = featureBySlug(inv, 'rt-feat')
    const input = JSON.stringify({
      treeHash: inv.treeHash,
      hashMethod: inv.hashMethod,
      syncedFeatures: {
        'rt-feat': {
          spec_hash: feat.artifacts.spec.hash,
          prd_hash: feat.artifacts.prd.hash,
          qa_hash: feat.artifacts.qa.hash,
          adr_hash: feat.artifacts.adrs.hash,
        },
      },
      deletedSlugs: [],
    })
    const inputFile = path.join(root, 'rt-input.json')
    fs.writeFileSync(inputFile, input, 'utf8')
    execFileSync('node', [UPDATE, '--repo-root', root, '--input-file', inputFile], { encoding: 'utf8' })
    assert.equal(runCheck(root).dirty, false, 'after sync the memory must be clean')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
