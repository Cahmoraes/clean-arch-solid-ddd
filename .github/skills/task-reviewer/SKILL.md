---
name: task-reviewer
description: Reviews completed task implementations against project code standards, TypeScript compilation, and test suites. Classifies issues by severity (critical, major, minor, positive) and generates a structured review artifact. Use when a task has been completed and needs quality validation before proceeding. Do not use for full code review of branches, QA testing, or bug fixing.
---

# Task Review

## Procedures

**Step 1: Identify the Task**
1. Search for task files matching the pattern `*_task.md` in the project (check `tasks/`, `.claude/tasks/`, `docs/tasks/` `<rootFolder>/task/`, or the project root).
2. If a task number is provided, find the specific `[num]_task.md` file.
3. If no task number is provided, find the most recent task file.
4. Read and understand the task requirements completely.

**Step 2: Identify Changed Files**
1. Use `git diff` and `git log` to identify files changed as part of this task.
2. Review each changed file carefully.
3. Read the full context of modified files, not just the diffs.

**Step 3: Conduct the Review**
1. Review the code against ALL criteria:
   - **Language**: All code in English (variables, functions, classes, comments).
   - **Naming**: camelCase for methods/functions/variables, PascalCase for classes/interfaces, kebab-case for files/directories.
   - **Clear naming**: No abbreviations, no names over 30 characters.
   - **Constants**: No magic numbers — use named constants.
   - **Functions**: Start with a verb, perform a single clear action.
   - **Parameters**: Maximum 3 parameters (use objects for more).
   - **Side effects**: Functions must do mutation OR query, never both.
   - **Conditionals**: Maximum 2 nesting levels, prefer early returns.
   - **Flag parameters**: Never use boolean flags to toggle behavior.
   - **Method size**: Maximum 50 lines per method.
   - **Formatting**: No blank lines within methods/functions.
   - **Comments**: Avoid comments — code should be self-explanatory.
   - **Variable declarations**: One variable per line, declare close to usage.
2. Verify compliance with CLAUDE.md and applicable skills.

**Step 4: Classify Issues**
1. For each issue found, classify as:
   - **CRITICAL**: Bugs, security issues, broken functionality, `any` types, missing error handling.
   - **MAJOR**: Project code standard violations, missing tests, bad naming.
   - **MINOR**: Style suggestions, minor improvements, optional optimizations.
   - **POSITIVE**: Well-done things that should be recognized.

**Step 5: Validate Tests and Types**
1. Run `lint` to verify TypeScript compilation.
2. Run `test` to verify all tests pass.

**Step 6: Generate Review Artifact**
1. Read the template at `assets/review-artifact-template.md`.
2. Create the file `[num]_task_review.md` in the SAME directory as the `[num]_task.md` file.
3. Apply status criteria:
   - **APPROVED**: No critical or major issues. Production-ready.
   - **APPROVED WITH OBSERVATIONS**: No critical issues, minor or few non-blocking major issues.
   - **CHANGES REQUESTED**: Critical issues found OR multiple major issues that must be resolved.

## Guidelines
- Be thorough but fair: review every changed file, but acknowledge good work.
- Be specific: always reference the exact file and line number for issues.
- Provide solutions: suggest fixes with code examples, not just problems.
- Write the review artifact in Brazilian Portuguese. Code examples remain in English.

## Error Handling
- If no task file is found, report to the user and ask for the task number.
- If git diff shows no changes, report that there is nothing to review.
- If typecheck or tests fail, include failures in the review artifact as critical issues.