---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. If a PRD exists alongside the spec, uses it to map tasks to user stories and functional requirements for better traceability.
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `superpowers:using-git-worktrees` skill at execution time.

**Save tasks to:** `docs/superpowers/<feature-name>/plans/`
- The feature directory is created during brainstorming — writing-plans saves into the existing `plans/` subdirectory
- (User preferences for plan location override this default)

## PRD Integration

Before starting the plan, check if a PRD exists:

> **Deterministic file discovery (preferred):**
> The script lives inside this skill's `scripts/` folder. Your skill context header shows the base directory
> (e.g. `Base directory for this skill: /path/to/writing-plans`). Use it to build the full path:
> ```bash
> node <writing-plans-skill-dir>/scripts/find-feature-files.cjs --feature-name <feature-name>
> ```
> If the base directory is not immediately available, locate the script with:
> ```bash
> node "$(find ~/.copilot/installed-plugins -name "find-feature-files.cjs" -path "*/writing-plans/scripts/*" 2>/dev/null | head -1)" \
>   --feature-name <feature-name>
> ```
> Outputs JSON with `prd.found`, `prd.path`, `spec.found`, `spec.path`, `tasksIndex.found`, `tasksIndex.path`.  
> Use these to confirm which files exist before referencing them in the plan.  
> **Fallback:** Use the discovery order below manually.

**Discovery order (use the first match):**
1. **Explicit path in context** — if `generating-prd` was invoked in this session, it passed the exact PRD path forward. Use it directly.
2. **Deterministic derivation** — look for `docs/superpowers/<feature-name>/prd/prd-<feature-name>.md`. The feature name is already known from brainstorming.
3. **Directory scan (fallback)** — look for files with `prd-` prefix in the feature's `prd/` directory.

**If a PRD is found:**

1. Read it and use its **user stories** and **functional requirements** (RF-001, RF-002...) as the primary source for task decomposition
2. Each task in the plan should trace back to one or more functional requirements — include the requirement ID in the task header (e.g., `### Task 3: User Login Flow [RF-003, RF-004]`)
3. Ensure every functional requirement in the PRD is covered by at least one task — if any requirement lacks a corresponding task, add one
4. Every task must map to a valid RF when PRD exists — orphan tasks (not linked to any requirement) suggest scope creep or a missing RF in the PRD
5. Use the PRD's "Fora de Escopo" section to avoid planning work that was explicitly excluded

**If no PRD exists:**

Proceed as normal — derive tasks from the design spec and conversation context. Note in the plan header: "Spec-only planning; no RF traceability available." The PRD is an enrichment, not a hard dependency. Omit `[RF-XXX]` tags everywhere.

## Task Tracking Artifacts

After writing the plan, generate persistent tracking files so execution skills (subagent-driven-development, executing-plans) can track progress across sessions. This is separate from the detailed plan — it's the management layer.

### Path Derivation

All paths derive from the feature name (kebab-case slug defined during brainstorming):

```
Feature root:     docs/superpowers/<feature-name>/
Spec:             docs/superpowers/<feature-name>/specs/<feature-name>-design.md
PRD:              docs/superpowers/<feature-name>/prd/prd-<feature-name>.md
Tasks index:      docs/superpowers/<feature-name>/plans/tasks-<feature-name>.md
Individual tasks: docs/superpowers/<feature-name>/plans/task-01.md, task-02.md, ...
```

Rule: everything lives inside the feature directory. Tasks are flat in `plans/` (no subfolders). No date prefixes. No aggregated plan file — the tasks index + individual task files ARE the plan.

### Tasks Index (`tasks-<feature-name>.md`)

**Before writing the tasks index, read `./templates/tasks-template.md` and copy its structure exactly.** Every tasks index MUST start with the exact header from that template — including the required agentic-worker notice banner and the `---` separator. Fill in feature-specific content: goal, architecture, tech stack, and the flat task list with RF-XXX mappings (only when a PRD exists; omit them entirely when planning from spec alone). Task file paths are relative to the same directory as the tasks index (flat in `plans/`).

### Individual Task Files (`task-NN.md`)

**Before writing each task file, read `./templates/task-file-template.md` and preserve all required headers exactly.** Each task file is self-contained — an engineer (or subagent) should be able to implement it without reading other task files. Content comes from the corresponding task in the plan.

**Parser-critical fields (must be present verbatim):**
- `**Status:** PENDING` — execution skills update this as work progresses
- `**PRD:** <relative-path>` — if no PRD exists, use `**PRD:** N/A`
- `**Spec:** <relative-path>` — always required

**Status values:** `PENDING` → `IN_PROGRESS` → `DONE`
- The `Status:` in the task file is the detailed view; the `[x]` in the tasks index is the management view

### When to Generate

Generate task tracking artifacts **immediately after** decomposing tasks and **before** the execution handoff message. The tasks index + individual task files together ARE the plan. If tasks change, task files should be regenerated.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## Research Phase

Before writing any task file, gather the codebase-specific information each task needs: exact file paths, function signatures, test patterns, naming conventions, import paths, and API contracts. Task files require zero placeholders — every step must contain real code, real paths, and real commands. That standard can only be met with thorough upfront research.

### Inline vs. Parallel Research

**Research inline in the main thread** when:
- The PRD has fewer than 5 functional requirements
- The feature touches a single subsystem or a small cluster of files
- The total codebase area to explore is small enough to hold in context while writing tasks

**Dispatch parallel read-only research subagents** when:
- The PRD has 5 or more functional requirements **or** spans multiple clearly independent subsystems (e.g., auth + billing + notifications)
- Codebase exploration would consume significant context before task-writing even begins — this risks hitting limits during the subsequent, more important task-writing phase
- Multiple unrelated file clusters need investigation (each cluster maps to a different task group)

Research agents are safe to parallelize: they perform only reads (no disk writes) and their domains do not overlap.

### Research Subagent Pattern

Each research subagent is scoped to one domain or functional requirement cluster. Give it a focused scope and ask for a structured report:

```
Research the [subsystem] for the [feature] implementation plan.

Return a structured markdown report covering:
1. Relevant existing files with their exact paths and key exports
2. Current test patterns in this subsystem (with real examples from the codebase)
3. Import path conventions and naming patterns
4. Existing types, interfaces, or schemas relevant to this feature
5. Integration points with other subsystems (what they expose, what they expect)

Read-only. Do not create or edit any files. Return findings only.
```

Dispatch all research subagents in the same turn. When all return, synthesize their reports in the main thread — one structured reference per subsystem. Then write all task files sequentially, with the full synthesized research available.

### Why Task Files Must Be Written Sequentially

Do NOT dispatch parallel subagents to write individual task files.

Tasks are self-contained by design — but they are not independent. Task N+1 may extend a data model introduced in task N, call a function defined in task N, or import from a file created in task N. A subagent writing task 3 in isolation cannot know the exact type signatures, function names, or file paths that task 1 and task 2 will produce. Parallel task writers produce cross-task inconsistencies (mismatched types, wrong import paths, duplicated code) that `validate-tasks.cjs` may not fully catch. Write tasks sequentially in the main thread, using the full synthesized research as your reference.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure — but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2–5 minutes):**
- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

**When writing `## Passos` sections in task files, read `./references/required-task-step-pattern.md` and follow the pattern exactly** — TDD steps with actual code blocks, exact run commands, and expected outputs. That file is the normative contract for step format.

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes. **Read `./references/self-review-checklist.md` and run through all five steps.** Fix issues inline as you find them — no need to re-review after fixing.

> **Deterministic validation (required — do not skip):** Run the validator script to catch format issues
> before handing off to execution skills. The script lives inside this skill's `scripts/` folder.
> Your skill context header shows the base directory (e.g. `Base directory for this skill: /path/to/writing-plans`).
> Use it to build the full path:
> ```bash
> node <writing-plans-skill-dir>/scripts/validate-tasks.cjs \
>   --tasks-index docs/superpowers/<feature-name>/plans/tasks-<feature-name>.md
> ```
> If the base directory is not immediately available, locate the script with:
> ```bash
> node "$(find ~/.copilot/installed-plugins -name "validate-tasks.cjs" -path "*/writing-plans/scripts/*" 2>/dev/null | head -1)" \
>   --tasks-index docs/superpowers/<feature-name>/plans/tasks-<feature-name>.md
> ```
> Fix any `errors` in the output before proceeding. `warnings` are advisory.
> **If the script cannot be found at all, explicitly report that the validator could not run — do not silently skip to manual inspection.**

### Optional External Review

If you want an independent second opinion on the plan's completeness and buildability, dispatch a plan document reviewer subagent using the template in `./plan-document-reviewer-prompt.md`. This is optional — use it for complex or high-stakes plans where a self-review might not be enough.

## Memory Persistence

> **Conditional on `session_memory_enabled`.** If `session_memory_enabled = false`, skip this entire section and proceed directly to Execution Handoff.

> **When enabled — do not skip.** This is the exit action of the Planejando state (see superpowers state diagram). Skipping it when memory is enabled means future sessions cannot recall prior decisions, constraints, or artifact paths for this feature.

After self-review passes and **before** the execution handoff, persist the planning artifacts to `persistent-memory`. **Read `./references/memory-persistence.md`** for the full procedure — graceful degradation, dedupe check, and what to persist.

The three entries to write are:
1. **Architectural decisions + constraints** (key choices from the spec)
2. **Feature scope + boundaries** (objective, in-scope stories, out-of-scope items)
3. **Artifact paths** (spec, PRD, tasks index paths + task count)

**Do not proceed to the Execution Handoff step until all three `pmem add` calls have succeeded** (or graceful degradation confirmed `pmem` is unavailable, or `session_memory_enabled = false`).

## Execution Handoff

After saving the tasks index and task files, **read `./references/execution-handoff-message.md` and offer its message verbatim to the user**, filling in the feature name and task count.
