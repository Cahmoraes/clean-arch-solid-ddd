# Memory Re-Sync from Committed Artifacts

This reference describes the re-sync mechanism that updates local persistent memory (`.memory/memory.db`) from artifacts committed to `docs/superpowers/` by other developers.

## When This Runs

The re-sync gate activates **after preferences are loaded** and **before Triagem**, only when `session_memory_enabled = true`. It is part of the superpowers entry flow, not the onboarding wizard (which only runs once for new users).

## Decision Flow

```
ChecandoPreferencias
  → session_memory_enabled = false → Triagem (skip entirely)
  → session_memory_enabled = true → check dirty state
    → no changes detected → Triagem (skip silently)
    → changes detected → ask user about re-sync
      → user accepts → SincronizandoMemoria → Triagem
      → user declines → Triagem
```

## Deterministic Scripts

The GateResync uses three shared scripts that collapse sequential tool calls into single bash invocations. They follow the same interface as `read-preferences.cjs`: JSON to stdout, warnings to stderr, exit codes 0/1, `--repo-root` flag.

Use the `using-superpowers` base directory from your skill context header to build absolute paths:

```
<using-superpowers-base-dir>/scripts/check-resync.cjs
<using-superpowers-base-dir>/scripts/compute-inventory.cjs
<using-superpowers-base-dir>/scripts/update-manifest.cjs
```

---

## Step 1 — Dirty Detection (Single Tool Call)

Run the dirty-check script before asking the user anything:

```bash
node <using-superpowers-base-dir>/scripts/check-resync.cjs \
  --repo-root "$(git rev-parse --show-toplevel)"
```

Inspect the output fields:

| Field | Action when true/false |
|-------|------------------------|
| `repoNotFound: true` | Skip silently — not a git repo |
| `docsExists: false` | Skip silently — nothing to sync |
| `dirty: false` | Skip silently — no changes since last sync |
| `memoryExists: false` | Run `pmem init` first, then continue |
| `dirty: true` | Proceed to ask the user |

The script reads the manifest and computes the tree hash in one call, replacing the previous 2–3 sequential tool calls.

### Manifest Schema (`.memory/resync-manifest.json`)

```json
{
  "last_synced_at": "2026-05-20T14:30:00Z",
  "last_synced_tree_hash": "abc123...",
  "last_synced_hash_method": "git",
  "synced_features": {
    "checkin-approve-reject": {
      "spec_hash": "sha256:...",
      "prd_hash": "sha256:...",
      "qa_hash": "sha256:...",
      "adr_hash": "sha256:..."
    },
    "winston-to-pino-migration": {
      "spec_hash": "sha256:...",
      "prd_hash": null,
      "qa_hash": null,
      "adr_hash": null
    }
  }
}
```

---

## The Re-Sync Question

Ask in the configured language (`preferences.communication.language`):

**pt-BR:**
> "Detectei alterações em `docs/superpowers/` desde a última sincronização da memória. Isso pode incluir artefatos produzidos por outros desenvolvedores. Deseja atualizar a memória persistida com base nesses artefatos?"
> - **Sim** — sincroniza memória com artefatos atuais
> - **Não** — pula e prossegue normalmente

**en:**
> "I detected changes in `docs/superpowers/` since the last memory sync. This may include artifacts produced by other developers. Would you like to update persistent memory based on these artifacts?"
> - **Yes** — sync memory with current artifacts
> - **No** — skip and proceed normally

---

## Step 2 — Inventory and Diff (Single Tool Call)

After the user accepts, get the full classified inventory:

```bash
node <using-superpowers-base-dir>/scripts/compute-inventory.cjs \
  --repo-root "$(git rev-parse --show-toplevel)"
```

The output contains a `features` array where each entry has:
- `slug`: directory name
- `status`: `"new"` | `"changed"` | `"unchanged"` | `"deleted"`
- `artifacts.spec`, `artifacts.prd`, `artifacts.qa`, `artifacts.adrs`: per-artifact `{ path, hash, exists, readable }`

Artifact paths per feature slug:

```
spec:  docs/superpowers/<slug>/specs/<slug>-design.md
prd:   docs/superpowers/<slug>/prd/prd-<slug>.md
qa:    docs/superpowers/<slug>/qa/qa-report-<slug>.md
adrs:  docs/superpowers/<slug>/adrs/*.md  (combined hash of all .md files, sorted)
```

This replaces the previous O(N_features) sequential view + shasum calls.

---

## Step 3 — Sync (selective, per feature)

> **No global prune.** `pmem prune --source "artifact-sync"` (without `--tags`) wipes the entire artifact-sync namespace before anything is re-added. If the re-add then fails partway (e.g. a transient subagent error), every synced feature is lost until the next session — even features that never changed. Instead, touch only the features that actually changed or were deleted, and leave `unchanged` features alone. `pmem prune` supports `--tags "<slug>"` to scope a prune to a single feature.

### Skip `unchanged` features

Features classified `unchanged` already have correct, current entries in memory. Do **not** prune or re-add them — leave their entries untouched. This is the manifest-based skip: identical content is never reprocessed.

### Parallelization: Batch reads across features

Batch all `view` calls for `new` and `changed` features **in a single LLM turn**. Issue `view` calls for their artifacts at once — do not wait for one feature before reading the next. Keep each feature's prune + re-add together (one agent owns one feature) so a failure is isolated to that single feature.

### For each `new` or `changed` feature

1. **Prune this feature's stale entries** (skip for `new` — nothing to prune yet, but harmless to run):
   ```bash
   pmem prune --source "artifact-sync" --tags "<feature-slug>"
   ```

2. **Read artifacts** — use the `path` from the inventory output. Skip any artifact where `readable: false` (warn in the summary). Skip artifacts where `exists: false` entirely (they simply haven't been created yet).

3. **Synthesize and persist** — see Content Synthesis Rules below:
   ```bash
   pmem add "<synthesized content>" \
     --tags "artifact-sync,<feature-slug>,<artifact-type>" \
     --source "artifact-sync"
   ```

> **Failure isolation:** if a feature's re-add fails, do **not** include that slug in `syncedFeatures` when writing the manifest (Step 4). Its manifest hash stays stale, so the next session re-detects it as `changed` and retries — and only that one feature was ever briefly affected.

### For each `deleted` feature

The feature directory was removed from `docs/superpowers/` since the last sync. Prune its stale entries (no `pmem add` — the feature no longer exists):

```bash
pmem prune --source "artifact-sync" --tags "<feature-slug>"
```

---

## Step 4 — Update Manifest (Single Tool Call)

After all pmem operations complete, write the updated manifest in one call. Pass the `treeHash` and `hashMethod` from the compute-inventory output, plus only the features that were actually synced (new/changed) and any deleted slugs:

```bash
node <using-superpowers-base-dir>/scripts/update-manifest.cjs \
  --repo-root "$(git rev-parse --show-toplevel)" << 'EOF'
{
  "treeHash": "<from compute-inventory output: treeHash>",
  "hashMethod": "<from compute-inventory output: hashMethod>",
  "syncedFeatures": {
    "<new-or-changed-slug>": {
      "spec_hash": "<from compute-inventory output: features[].artifacts.spec.hash>",
      "prd_hash":  "<from compute-inventory output: features[].artifacts.prd.hash>",
      "qa_hash":   "<from compute-inventory output: features[].artifacts.qa.hash>",
      "adr_hash":  "<from compute-inventory output: features[].artifacts.adrs.hash>"
    }
  },
  "deletedSlugs": ["<deleted-slug-1>", "<deleted-slug-2>"]
}
EOF
```

The script merges the update into the existing manifest, preserving unchanged features. Unchanged features do not need to be included in `syncedFeatures`.

---

## Content Synthesis Rules

When creating memory entries from artifacts, synthesize — don't dump raw content:

**From a spec (`*-design.md`):**
```
Feature: <feature-slug>. Architecture: <key decisions summary>. Stack: <technologies>. Constraints: <main constraints>. Patterns: <design patterns used>. Artifact: docs/superpowers/<slug>/specs/<slug>-design.md
```

**From a PRD (`prd-*.md`):**
```
Feature: <feature-slug>. Objective: <one-line goal>. User stories: <count> stories covering <main areas>. Requirements: RF-001 through RF-NNN. Out of scope: <excluded items>. Artifact: docs/superpowers/<slug>/prd/prd-<slug>.md
```

**From a QA report (`qa-report-*.md`):**
```
Feature: <feature-slug>. QA status: <PASSED|PARTIAL|FAILED>. Stories verified: <N>/<total>. Known issues: <summary or "none">. Artifact: docs/superpowers/<slug>/qa/qa-report-<slug>.md
```

**From ADR files (`adrs/*.md`):**
```
Feature: <feature-slug>. Architecture decisions: <count> ADRs. <ADR-001 title>: <one-line decision>. <ADR-002 title>: <one-line decision>. [...] Artifact: docs/superpowers/<slug>/adrs/
```

---

## Deduplication Guarantees

1. **Source-based isolation:** All resync entries use `source="artifact-sync"`. Normal planning entries use `source="assistant"`. They never conflict.
2. **Content hash:** `pmem add` already deduplicates by `content_hash` (SHA-256 of normalized content). Identical entries are silently skipped.
3. **Per-feature prune-before-add:** For each `changed` feature, only that feature's old entries are pruned (via `--tags "<slug>"`) before its new ones are added. This prevents accumulation without touching other features.
4. **Manifest-based skip:** Unchanged features are not pruned or re-processed at all — their existing entries stay intact.

---

## Graceful Degradation

The scripts handle all failure cases and surface them via the JSON output:

| Failure | Script behavior | LLM action |
|---------|----------------|------------|
| `pmem` not installed or unavailable | (not in scripts) | Warn user once, skip sync, proceed to Triagem |
| `.memory/` directory missing | `check-resync`: `memoryExists: false` | Run `pmem init` first, then continue |
| `docs/superpowers/` doesn't exist | `check-resync`: `docsExists: false` | Skip silently — `dirty` will be false |
| Not a git repo | `check-resync`: `repoNotFound: true` | Skip silently |
| Git not available | Both scripts fall back to stat fingerprint automatically (`hashMethod: "stat"`) | No action needed |
| Individual artifact unreadable | `compute-inventory`: artifact `readable: false` + entry in `errors[]` | Skip that artifact, warn in summary |
| All artifacts for a feature unreadable | Feature still listed with error artifacts | Skip feature, warn in summary |
| Sync interrupted mid-way | Selective per-feature prune isolates failures — only the in-flight feature is affected, never the whole namespace | Omit failed slugs from the manifest; next session re-detects and re-processes only those |
| Manifest corrupt/unparseable | Script warns to stderr, treats as missing → `dirty: true` | Re-sync proceeds cleanly |
| Feature removed from filesystem | `compute-inventory`: `status: "deleted"` | Prune pmem entries, include in `deletedSlugs` |

---

## Summary Report

After sync completes, report to the user:

**pt-BR:**
> "✅ Memória sincronizada: **X** features atualizadas, **Y** novas entries adicionadas, **Z** entries substituídas."

**en:**
> "✅ Memory synced: **X** features updated, **Y** new entries added, **Z** entries replaced."

Include a note for any artifacts that were skipped due to read errors.

---

## Session Variables

| Variable | Initial | Description |
|----------|---------|-------------|
| `session_resync_completed` | `false` | Whether re-sync was performed or skipped this session |

This variable prevents re-asking during the same session if the user returns to the triage state.
