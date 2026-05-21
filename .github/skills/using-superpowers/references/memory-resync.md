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

## Dirty Detection (Cheap Check)

Before asking the user, determine if there are new/changed artifacts:

1. Read `.memory/resync-manifest.json` (if it exists)
2. List all directories in `docs/superpowers/`
3. For each feature directory, compute a lightweight fingerprint:
   - File list + last modification timestamps (via `git log -1 --format=%H -- <path>` or stat)
   - Or simpler: `git log -1 --format=%H -- docs/superpowers/` for the whole tree
4. Compare with manifest's `last_synced_tree_hash`
5. If identical → skip silently (no question asked)
6. If different → proceed to ask user

### Manifest Schema (`.memory/resync-manifest.json`)

```json
{
  "last_synced_at": "2026-05-20T14:30:00Z",
  "last_synced_tree_hash": "abc123...",
  "synced_features": {
    "checkin-approve-reject": {
      "spec_hash": "sha256...",
      "prd_hash": "sha256...",
      "qa_hash": "sha256..."
    },
    "winston-to-pino-migration": {
      "spec_hash": "sha256...",
      "prd_hash": null,
      "qa_hash": null
    }
  }
}
```

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

## Sync Algorithm

### Phase 1: Inventory

Scan `docs/superpowers/` and build an inventory of all features and their artifacts:

```
For each directory in docs/superpowers/:
  feature_slug = directory name
  artifacts = {
    spec: docs/superpowers/<slug>/specs/<slug>-design.md (if exists)
    prd:  docs/superpowers/<slug>/prd/prd-<slug>.md (if exists)
    qa:   docs/superpowers/<slug>/qa/qa-report-<slug>.md (if exists)
  }
```

**Skip:** Individual task files (`task-NN.md`), evidence directories, and non-markdown files.

### Phase 2: Diff Against Manifest

For each feature in inventory:
- Compute SHA-256 of each artifact's content
- Compare with `synced_features[slug]` in manifest
- Classify as: `new` (not in manifest), `changed` (hash differs), or `unchanged`

### Phase 3: Sync Changed/New Features

For each feature classified as `new` or `changed`:

1. **Prune old entries for this feature:**
   ```bash
   pmem prune --source "artifact-sync" --tags "<feature-slug>"
   ```
   Note: If `pmem prune` doesn't support `--tags` filter, use search + manual delete, or prune all artifact-sync entries and re-add everything.

2. **Read relevant artifacts** and extract memory-worthy content:

   | Artifact | What to extract |
   |----------|----------------|
   | `*-design.md` (spec) | Architecture decisions, technology choices, constraints, interfaces, patterns chosen |
   | `prd-*.md` (PRD) | Feature objective, user stories summary, functional requirements IDs, out-of-scope items |
   | `qa-report-*.md` (QA) | Quality status (PASSED/PARTIAL/FAILED), verified behaviors count, known issues |

3. **Persist to memory:**
   ```bash
   pmem add "<synthesized content>" --tags "artifact-sync,<feature-slug>,<artifact-type>" --source "artifact-sync"
   ```

### Phase 4: Update Manifest

After successful sync, write updated `.memory/resync-manifest.json` with:
- Current timestamp
- Current tree hash
- Updated per-feature hashes

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

## Deduplication Guarantees

1. **Source-based isolation:** All resync entries use `source="artifact-sync"`. Normal planning entries use `source="assistant"`. They never conflict.
2. **Content hash:** `pmem add` already deduplicates by `content_hash` (SHA-256 of normalized content). Identical entries are silently skipped.
3. **Prune-before-add:** For changed features, old entries are pruned before new ones are added. This prevents accumulation.
4. **Manifest-based skip:** Unchanged features are not re-processed at all.

## Graceful Degradation

| Failure | Behavior |
|---------|----------|
| `pmem` not installed or unavailable | Warn user once, skip sync, proceed to Triagem |
| `.memory/` directory missing | Run `pmem init` first, then proceed with sync |
| `docs/superpowers/` doesn't exist | Skip silently (nothing to sync) |
| Individual artifact unreadable | Log warning, skip that artifact, continue with others |
| Sync interrupted mid-way | Partial sync is acceptable — memory entries already added remain valid. Manifest is written only after full completion, so next session will re-detect diffs and re-process all changed features (including already-synced ones). This is safe because prune-before-add is idempotent. |
| Git not available (for tree hash) | Fall back to file stat timestamps for dirty detection |

## Summary Report

After sync completes, report to the user:

**pt-BR:**
> "✅ Memória sincronizada: **X** features atualizadas, **Y** novas entries adicionadas, **Z** entries substituídas."

**en:**
> "✅ Memory synced: **X** features updated, **Y** new entries added, **Z** entries replaced."

## Session Variables

| Variable | Initial | Description |
|----------|---------|-------------|
| `session_resync_completed` | `false` | Whether re-sync was performed or skipped this session |

This variable prevents re-asking during the same session if the user returns to the triage state.
