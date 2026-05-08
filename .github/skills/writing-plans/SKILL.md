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
> ```bash
> node scripts/find-feature-files.js --feature-name <feature-name>
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

Proceed as normal — derive tasks from the design spec and conversation context. Note in the plan header: "Spec-only planning; no RF traceability available." The PRD is an enrichment, not a hard dependency.

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

Use the template in `./templates/tasks-template.md`. The index is a flat list — no subtasks, no steps. Each entry links to its individual task file:

```markdown
# Tarefas: [Feature Name]

**Spec:** `../specs/<feature-name>-design.md`
**PRD:** `../prd/prd-<feature-name>.md`

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]

## Tarefas

- [ ] 1. Setup project structure [RF-001] → `task-01.md`
- [ ] 2. User login flow [RF-002, RF-003] → `task-02.md`
- [ ] 3. Token refresh [RF-004] → `task-03.md`
```

The `[RF-XXX]` mapping is included only when a PRD exists. Task file paths are relative to the same directory as the tasks index (flat in `plans/`).

### Individual Task Files (`task-NN.md`)

Each task file is self-contained — an engineer (or subagent) should be able to implement it without reading other task files. Content comes from the corresponding task in the plan:

```markdown
# Task N: [Task Title] [RF-XXX, RF-YYY]

**Status:** PENDING
**PRD:** `../prd/prd-<feature-name>.md`
**Spec:** `../specs/<feature-name>-design.md`

## Visão Geral

[Brief description of what this task accomplishes]

## Arquivos

- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py`
- Test: `tests/exact/path/to/test.py`

## Passos

[Full steps with code blocks, copied from the plan — not references.
Each step uses checkbox syntax for fine-grained tracking]

- [ ] **Step 1: Write the failing test**
...

## Critérios de Sucesso

- [Measurable success criteria]
- [Acceptance criteria linked to RF-XXX if PRD exists]
```

**Mandatory context references:** Every task file MUST include `**PRD:**` and `**Spec:**` fields in the header pointing to the relative paths of the PRD and design spec. These enable execution agents to read full feature context (functional requirements, user stories, architecture decisions) before implementing. If no PRD exists, use `**PRD:** N/A`.

**Status values:** `PENDING` → `IN_PROGRESS` → `DONE`
- Execution skills update the `Status:` field as they work through tasks
- The `Status:` in the task file is the detailed view; the `[x]` in the tasks index is the management view

### When to Generate

Generate task tracking artifacts **immediately after** decomposing tasks and **before** the execution handoff message. The tasks index + individual task files together ARE the plan. If tasks change, task files should be regenerated.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Tasks Index Header

**Every tasks index MUST start with this header:**

```markdown
# Tarefas: [Feature Name]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/<feature-name>-design.md`
**PRD:** `../prd/prd-<feature-name>.md`

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

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

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. PRD traceability (if PRD exists):** Verify every functional requirement (RF-XXX) from the PRD maps to at least one task. List any orphaned requirements. Verify that no task implements something listed in "Fora de Escopo."

**3. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**4. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

**5. Task tracking artifacts:** Verify that:
- `tasks-<feature-name>.md` exists and lists every task (same count, same titles)
- Every task in the index has a corresponding `task-NN.md` file in the same `plans/` directory
- RF-XXX mappings in the index match those in the task files (if PRD exists)
- All checkboxes are `[ ]` (none pre-checked)
- Every task file has `**PRD:**` and `**Spec:**` fields with correct relative paths
- Paths in the index correctly point to existing task files

> **Deterministic validation (preferred):** Run the validator script to catch format issues automatically:
> ```bash
> node scripts/validate-tasks.js --tasks-index docs/superpowers/<feature-name>/plans/tasks-<feature-name>.md
> ```
> Fix any `errors` in the output before handing off to execution skills. `warnings` are advisory.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the tasks index and task files, offer execution choice:

**"Tasks created and saved to `docs/superpowers/<feature-name>/plans/`.**
**Task index: `tasks-<feature-name>.md` with N tasks.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + two-stage review
- Pass the tasks index path to the execution skill

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Batch execution with checkpoints
- Pass the tasks index path to the execution skill for review
