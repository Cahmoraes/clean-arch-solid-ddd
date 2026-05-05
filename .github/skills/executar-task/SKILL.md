---
name: executar-task
description: Implements feature tasks by orchestrating subagent-driven development — reads PRD/TechSpec context, dispatches an implementer subagent, runs spec compliance and code quality review gateways, executes QA with reports in the PRD directory, and marks tasks complete with a commit suggestion. Use when the user asks to implement a task, execute a task, or start working on a specific task number. Do not use for standalone QA, standalone code review, creating tasks, or bug fixing unrelated to task implementation.
user-invocable: true
argument-hint: prd techspec task
---

# Task Execution

You act as **controller/orchestrator**. You never implement code directly — you coordinate specialized subagents, each with isolated context. Your job is to prepare precise context, dispatch subagents, manage review loops, and ensure all quality gates pass before marking a task complete.

## Procedures

**Step 1: Pre-Task Configuration (Mandatory)**
1. Read the task definition file at `./tasks/prd-[feature-slug]/[num]_task.md`.
2. Read the PRD at `./tasks/prd-[feature-slug]/prd.md` for context.
3. Read the Tech Spec at `./tasks/prd-[feature-slug]/techspec.md` for technical requirements.
4. Identify dependencies from previous tasks and verify they are complete.
5. Do NOT skip any of these reads.

**Step 2: Load Required Skills**
1. Identify the technologies involved in the task (React, Hono, shadcn, etc.).
2. Load the corresponding skills based on technologies used.
3. Use Context7 CLI command shell `ctx7` to analyze documentation of involved languages, frameworks, and libraries.

**Step 3: Task Analysis (Mandatory)**
1. Analyze the task considering:
   - Main objectives.
   - How the task fits into the project context.
   - Alignment with project rules and standards.
   - Possible approaches or solutions.
2. Generate a task summary:
   - Task ID and Name.
   - PRD Context (main points).
   - Tech Spec Requirements (key technical requirements).
   - Dependencies.
   - Main Objectives.
   - Risks/Challenges.

**Step 4: Approach Plan (Mandatory)**
1. Define a numbered step-by-step approach.
2. Do NOT skip any step.

**Step 5: Implementation via Subagente (Mandatory)**

Read `artifacts/shared/skills/subagent-driven-development/implementer-prompt.md` and dispatch a `general-purpose` subagent using that template. Subagents do not inherit your session — you must construct everything they need. Provide the following **dispatch payload**:

- **Task Description**: full text from `[num]_task.md` (paste it — do not have the subagent read the file)
- **Context**: PRD summary relevant to this task, Tech Spec requirements, dependency status, known risks and open assumptions
- **Approach Plan**: the numbered plan from Step 4
- **Acceptance Criteria**: how to verify the task is done (from PRD/TechSpec)
- **Technology findings**: relevant skills/docs identified in Step 2
- **Project standards**: key rules from AGENTS.md applicable to this task
- **Working directory**: project root

Handle the subagent's status:
- **DONE**: proceed to Step 6.
- **DONE_WITH_CONCERNS**: read the concerns; if they affect correctness or scope, resolve them before proceeding; otherwise note them and proceed.
- **NEEDS_CONTEXT**: provide the missing information and re-dispatch.
- **BLOCKED**: assess the blocker and take one of: provide more context, re-dispatch with a more capable model, break the task into smaller pieces, or escalate to the user if the plan itself needs revision. Never retry without making a change.

**Step 6: Gateway — Spec Compliance Review (Mandatory)**

Only after implementation status is DONE or DONE_WITH_CONCERNS (concerns addressed).

Read `artifacts/shared/skills/subagent-driven-development/spec-reviewer-prompt.md` and dispatch a `general-purpose` subagent using that template, providing:
- Full task requirements text
- Implementer's report from Step 5

If the reviewer returns ✅ **Spec compliant**: proceed to Step 7.

If the reviewer returns ❌ **Issues found**: re-dispatch the implementer subagent (Step 5 template) with the specific gaps to fix, then re-review. Repeat until ✅. Escalate to the user if the same issue persists after 3 attempts.

**Step 7: Gateway — Code Quality Review (Mandatory)**

Only after Spec Compliance ✅.

Read `artifacts/shared/skills/subagent-driven-development/code-quality-reviewer-prompt.md` and dispatch a **`code-review`** subagent using that template, providing:
- **WHAT_WAS_IMPLEMENTED**: from the implementer's report
- **PLAN_OR_REQUIREMENTS**: task from `./tasks/prd-[feature-slug]/[num]_task.md`
- **FILES_CHANGED**: list from the implementer's report (use this as the primary scope)
- **DIFF**: output of `git diff HEAD` as supporting evidence
- **DESCRIPTION**: task summary from Step 3

If the reviewer approves (no Critical or Important issues): proceed to Step 8.

If Critical or Important issues are found: re-dispatch the implementer subagent (Step 5 template) with the issues to fix, then re-review. After any code fix, return to Step 6 (Spec Compliance) before proceeding to this step again. Escalate to the user if the same issue persists after 3 attempts.

**Step 8: Gateway — QA (Mandatory)**

After both code review gateways pass.

Invoke the `qa-execution` skill with `qa-output-path=./tasks/prd-[feature-slug]/`. QA artifacts land at `./tasks/prd-[feature-slug]/qa/`. Review the generated `verification-report.md`:

- If verification passes: proceed to Step 9.
- If blocking issues are found that require code changes: re-dispatch the implementer subagent (Step 5 template) with the failing scenarios, then restart from **Step 6** (Spec Compliance Review) before running QA again. This ensures code changes from QA fixes go through the full review chain.
- If the environment or infrastructure is blocking QA (not a code defect): report the blocker to the user rather than redispatching the implementer.

Optionally, invoke `qa-report` with the same `qa-output-path` to generate test plan and test case documentation if the task warrants it.

**Step 9: Mark Task and Subtask Complete (Mandatory)**
1. For each completed subtask in `[num]_task.md`, change `- [ ]` to `- [x]`.
2. For each test item in the `## Testes da Tarefa` section of `[num]_task.md`, change `- [ ]` to `- [x]`.
3. After all subtasks and test items are marked `[x]`, mark the task as complete in `tasks.md` by changing its `- [ ]` to `- [x]`.

**Step 10: Suggest Commit (Mandatory)**
> ⚠️ Este passo só deve ser executado **após todas as tasks estarem marcadas como concluídas** (`[x]` em `tasks.md`). Não interrompa o fluxo para pedir confirmação — apenas apresente os comandos ao final, de forma agrupada por task.

For each completed task, provide the corresponding commit commands grouping only the files changed by that task. Do NOT aggregate all files into a single commit — each task must have its own isolated commit suggestion.

Suggest a conventional commit message in pt-BR, imperative mood:

```sh
# Task N — [título da task]
git add [arquivos alterados por esta task]
git commit -m "[type]([scope]): [descrição imperativa em pt-BR]"
```

Examples:
- `feat(auth): implementar autenticação com JWT`
- `fix(cart): corrigir cálculo de desconto no checkout`
- `refactor(user): extrair lógica de validação para use case`

## Error Handling
- If the task file does not exist, halt and report to the user.
- If dependencies are not complete, warn the user and ask whether to proceed.
- If the implementer returns BLOCKED after re-dispatch attempts, escalate to the user with a description of the blocker.
- If a review gateway (spec compliance or code quality) cannot be passed after 3 attempts with the same issue, escalate to the user with a summary of what is blocking and what has been tried.
- If QA reveals a failing scenario that the implementation cannot resolve after 2 full cycles (fix → review → QA), escalate to the user.
- If QA is blocked by environment or infrastructure issues (not code defects), report directly to the user without redispatching the implementer.