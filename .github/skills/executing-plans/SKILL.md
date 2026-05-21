---
name: executing-plans
description: Use when you have a written implementation plan to execute in a separate session with review checkpoints
---

# Executing Plans

## Overview

Load plan, review critically, execute all tasks, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

**Note:** Tell your human partner that Superpowers works much better with access to subagents. The quality of its work will be significantly higher if run on a platform with subagent support (such as Claude Code or Codex). If subagents are available, use superpowers:subagent-driven-development instead of this skill.

## Workflow Preferences

Before executing any task, read `.superpowers/preferences.yml` in the user's repository root.

> **Deterministic reading (preferred):** `node ../using-superpowers/scripts/read-preferences.js`  
> Outputs JSON with `preferences.workflow.auto_commit`, `preferences.communication.language`, etc.  
> **Fallback:** Read via `view` directly — do NOT use `glob` (misses hidden dirs).

- If `workflow.auto_commit` = false → do NOT commit after tasks. Inform the user that commits are pending.
- If `workflow.auto_commit` = true (or file missing) → commit normally after each completed task.
- If `workflow.confirm_destructive_actions` = true → ask before deleting or overwriting files.
- If the file does not exist → warn the user and ask if they want to create it. Then proceed with defaults.
- You may suggest overriding a preference with justification, but ONLY execute with user confirmation.

## Memory Gate Check

> **Conditional on `session_memory_enabled`.** If `session_memory_enabled = false`, skip this entire section and proceed directly to Caveman Mode.

> **When enabled — do not skip.** This is the entry guard of the Executando state. Memory must have been persisted at the end of `writing-plans` (exit action of Planejando state). If it wasn't, persist it now before executing any task.

Before starting task execution, verify that planning artifacts were persisted:

```bash
pmem search "<feature-name>" --limit 3
```

- **If results include entries for this feature** (decisions, scope, artifacts paths): memory is present — proceed.
- **If no results found**: memory was not persisted during planning. Run the full persistence procedure now — read `writing-plans/SKILL.md § Memory Persistence` and `writing-plans/references/memory-persistence.md` for the exact `pmem add` calls to make (3 entries: decisions, scope, artifact paths). Do not start task execution until all three entries are written.

## Caveman Mode

Before starting Step 2 (Execute Tasks), check caveman session state (defined in `using-superpowers` Caveman Mode section):

1. **If `session_caveman_active = false` AND `session_caveman_prompted = false`:** Ask the dynamic question once (see `using-superpowers` policy) and record the result.
2. **If `session_caveman_active = true`:** Invoke the `caveman` skill at `session_caveman_level` (e.g., `/caveman full`). Caveman stays active through all task execution, verifications, and QA gate.
3. **Before invoking `finishing-a-development-branch`:** Explicitly deactivate caveman — say "normal mode" or "stop caveman". Finalizando requires clear human-facing communication.

## The Process

### Step 1: Load Tasks Index

> **Deterministic task parsing (preferred):**
> ```bash
> node ../subagent-driven-development/scripts/parse-tasks.js --tasks-index <path>
> ```
> Outputs JSON with `found`, `allDone`, `completed`, `pending`, `inProgress`, `mismatches`.  
> Use `completed` to skip already-done tasks and `pending`+`inProgress` for what remains.  
> **Fallback:** Read and parse the tasks index file manually.

1. Read the tasks index file (`tasks-<feature-name>.md`) — passed explicitly in context or discovered in the feature's `plans/` directory
2. If tracker exists: skip tasks already marked `[x]` (session resume), note which tasks remain
3. For each remaining `[ ]` task, read the individual task file for full context
4. **Read PRD and Spec:** Before executing any task, read the `**PRD:**` and `**Spec:**` paths from the task file header to understand the full feature context — especially functional requirements (RF-XXX) and architectural decisions that inform implementation choices
5. Review critically — identify any questions or concerns about the tasks
6. If concerns: Raise them with your human partner before starting
7. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Tasks

For each task:
1. **Physically edit** `task-NN.md` using your file-editing tool: change `**Status:** PENDING` to `**Status:** IN_PROGRESS`. This is a real disk write — not a TodoWrite entry or a mental note — and must happen before any implementation begins.
2. Follow each step exactly (plan has bite-sized steps). **After completing each individual subtask**, immediately edit `task-NN.md` and mark it done: change `- [ ] N.` → `- [x] N.` for that specific subtask's line. This is an incremental disk write done one subtask at a time — do NOT defer these edits to the end of the task.
3. Run verifications as specified (use verification-before-completion)
4. After verification passes, make **three physical file edits on disk**:
   - Edit `tasks-<feature-name>.md`: change `- [ ] N.` → `- [x] N.` for that task's line
   - Edit `task-NN.md`: change `**Status:** IN_PROGRESS` → `**Status:** DONE`
   - Verify all subtasks in `task-NN.md` are marked `[x]` — if any were missed during execution, mark them now

   These file edits are the authoritative audit record. `finishing-a-development-branch` reads the tasks index directly to verify all tasks are `[x]` — if the files are not edited on disk, the branch cannot be finished.
5. Mark as completed in TodoWrite

### Step 3: Complete Development

After all tasks complete and verified:

**QA Gate (if PRD exists):**

Before invoking `finishing-a-development-branch`, check whether a PRD exists for this feature:
- Discovery: explicit path in context → `docs/superpowers/<feature-name>/prd/prd-<feature-name>.md` → directory scan for `prd-` prefix files
- **If no PRD found:** Skip the QA Gate and proceed directly to `finishing-a-development-branch`
- **If PRD found:** Ask the user whether they want to run the QA gate:
  ```
  A PRD was found for this feature. Do you want to run user-story-verification (QA gate)
  to verify all user stories before finishing the branch?
  ```
  - **User confirms:** Invoke `superpowers:user-story-verification`, passing the PRD path and feature name
    - If status is `PASSED` or `PARTIAL`: proceed to `finishing-a-development-branch`
    - If status is `FAILED`: **STOP** — report the failing user stories to the user; do not invoke `finishing-a-development-branch` until the user resolves the failures and re-runs this skill
  - **User declines:** Skip the gate and proceed directly to `finishing-a-development-branch`

**Finish the branch:**
- **If caveman is active:** deactivate first — say "normal mode" or "stop caveman". `finishing-a-development-branch` communicates options to the user and requires normal prose.
- Announce: "I'm using the finishing-a-development-branch skill to complete this work."
- **REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch
- Pass the tasks index path so it can verify all tasks are `[x]`
- Follow that skill to verify tests, present options, execute choice

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Required workflow skills:**
- **superpowers:using-git-worktrees** - Ensures isolated workspace (creates one or verifies existing)
- **superpowers:writing-plans** - Creates the plan this skill executes
- **superpowers:user-story-verification** - QA Gate: verifies user stories from PRD before finishing branch (consent-based when PRD exists; skipped when no PRD or user declines)
- **superpowers:finishing-a-development-branch** - Complete development after all tasks
