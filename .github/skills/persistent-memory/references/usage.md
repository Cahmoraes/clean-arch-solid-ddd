# Persistent Memory Usage

## Quick Start

```bash
.agents/skills/persistent-memory/scripts/pmem init
.agents/skills/persistent-memory/scripts/pmem sync
.agents/skills/persistent-memory/scripts/pmem backfill-embeddings
.agents/skills/persistent-memory/scripts/pmem search "investor update" --limit 8
```

## One-Time Legacy Cleanup

```bash
.agents/skills/persistent-memory/scripts/pmem cleanup-legacy
.agents/skills/persistent-memory/scripts/pmem backfill-embeddings
```

## Prune by Source

```bash
# prune all notes from a source
.agents/skills/persistent-memory/scripts/pmem prune --source "smoke-test"

# prune only old notes from a source
.agents/skills/persistent-memory/scripts/pmem prune --source "temp-import" --older-than 30

# prune only notes within a source that carry ALL of the given tags
# (used by artifact-sync to scope a prune to a single feature, avoiding a
#  destructive global prune of the whole source)
.agents/skills/persistent-memory/scripts/pmem prune --source "artifact-sync" --tags "login-security-lockout"
```

## Store Durable Memory

```bash
.agents/skills/persistent-memory/scripts/pmem add "Always convert times to CET" --tags "timezone,calendar" --source "assistant"
```

## Inspect and Verify

```bash
.agents/skills/persistent-memory/scripts/pmem recent --limit 10
.agents/skills/persistent-memory/scripts/pmem stats
```

## Notes

- `search` updates `hits` and `last_seen_at` for returned rows.
- `hits` are analytics-oriented (not a direct ranking boost).
- `search` combines lexical + semantic retrieval.
- semantic backend prefers `sqlite-vec` and auto-falls back to Python cosine.
- `sync` is a database-only health check and prints embedding coverage.
- `.memory/memory.db` is the single source of truth.
