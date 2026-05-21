# Memory Persistence

> **Guard:** If `session_memory_enabled = false`, skip this entire document and return to the calling skill — proceed directly to Execution Handoff. The rest of this procedure applies only when persistent memory is enabled.

After self-review passes and before the execution handoff, persist the key planning artifacts to `persistent-memory` so future brainstorming sessions can recall them. This ensures prior decisions, constraints, and scope boundaries are available across sessions.

## Graceful Degradation

1. Run `pmem sync` to verify memory availability
2. If it fails with "database not found": run `pmem init`, then retry
3. If `pmem` is completely unavailable (not installed, broken): skip this section silently and proceed to Execution Handoff

## Dedupe Check

Before writing, search for existing memory about this feature:
```bash
pmem search "<feature-name>" --limit 3
```
If results already exist for this exact feature (same slug in artifact paths), skip the write — the memory is already persisted from a previous planning run. Only write if this is a new feature or the plan has materially changed (new tasks, revised decisions).

## What to Persist

Persist **2-3 focused entries** (not one monolithic blob). Each entry should be concise and optimized for future retrieval:

**Entry 1 — Architectural decisions and constraints:**
```bash
pmem add "Feature: <feature-name>. Decisions: [list key architectural choices from the spec, e.g., 'Use Observer pattern for domain events', 'Repository pattern with Inversify DI']. Constraints: [list established rules, e.g., 'No exceptions for business logic — use Either', 'Maximum 3 dependencies per use case']." \
  --tags "architecture,decision,<feature-name>,<bounded-context>" \
  --source "assistant"
```

**Entry 2 — Feature scope and boundaries:**
```bash
pmem add "Feature: <feature-name>. Objective: [one-sentence goal from PRD]. Scope: [key user stories or capabilities]. Out-of-scope: [explicitly excluded items]. Bounded context: <context-name>." \
  --tags "scope,prd,<feature-name>,<bounded-context>" \
  --source "assistant"
```

**Entry 3 — Artifact paths (reference index):**
```bash
pmem add "Feature: <feature-name>. Artifacts — Spec: docs/superpowers/<feature-name>/specs/<feature-name>-design.md | PRD: docs/superpowers/<feature-name>/prd/prd-<feature-name>.md | Tasks: docs/superpowers/<feature-name>/plans/tasks-<feature-name>.md | Task count: N." \
  --tags "artifacts,paths,<feature-name>" \
  --source "assistant"
```

## Rules

- Keep each entry under 500 characters when possible — concise entries have better retrieval quality
- Use concrete domain terms in the text (not generic words like "the system" or "the module")
- Tags should include the feature slug and the bounded context name for targeted retrieval
- If no PRD exists, omit Entry 2 or adapt it from the spec's scope section
- This step is automatic — no user confirmation required
