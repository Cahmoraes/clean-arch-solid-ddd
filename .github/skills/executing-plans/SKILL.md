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

- If `workflow.auto_commit` = false → do NOT commit after tasks. Inform the user that commits are pending.
- If `workflow.auto_commit` = true (or file missing) → commit normally after each completed task.
- If `workflow.confirm_destructive_actions` = true → ask before deleting or overwriting files.
- If the file does not exist → warn the user and ask if they want to create it. Then proceed with defaults.
- You may suggest overriding a preference with justification, but ONLY execute with user confirmation.

## The Process

### Step 1: Load Tasks Index

1. Read the tasks index file (`tasks-<feature-name>.md`) — passed explicitly in context or discovered in the feature's `plans/` directory
2. If tracker exists: skip tasks already marked `[x]` (session resume), note which tasks remain
3. For each remaining `[ ]` task, read the individual task file for full context
4. **Read PRD and Spec:** Before executing any task, read the `**PRD:**` and `**Spec:**` paths from the task file header to understand the full feature context — especially functional requirements (RF-XXX) and architectural decisions that inform implementation choices
5. Review critically — identify any questions or concerns about the tasks
6. If concerns: Raise them with your human partner before starting
7. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Tasks

For each task:
1. Update task file status: `PENDING` → `IN_PROGRESS` (if tracker exists)
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified (use verification-before-completion)
4. After verification passes: update task tracker — mark `[x]` in `*-tasks.md` and `Status: DONE` in individual task file
5. Mark as completed in TodoWrite

### Step 3: Complete Development

After all tasks complete and verified:
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
- **superpowers:finishing-a-development-branch** - Complete development after all tasks
