---
name: user-story-verification
description: "QA Gate that verifies every user story in a feature PRD against the live implementation. Dispatches parallel subagents per user story — running existing tests, creating missing acceptance tests, and capturing UI screenshots via Playwright/Puppeteer when available. Produces a structured QA report with PASSED/FAILED/PARTIAL status and evidence files. Invoked automatically by subagent-driven-development and executing-plans after all implementation tasks complete, before finishing-a-development-branch. Also use directly when you need to verify that all user stories from a PRD are fully implemented before merging or creating a PR. Activate whenever someone says 'rodar QA', 'verificar user stories', 'validar implementação contra PRD', 'run acceptance tests', or 'generate QA report'."
---

# User Story Verification

QA Gate that verifies each user story in the PRD against the implementation before a branch can be merged or submitted for PR. Collects test evidence and UI screenshots, then produces a consolidated report.

**Announce at start:** "I'm using the user-story-verification skill to verify user stories against the implementation."

## Why This Gate Exists

Unit tests and code quality reviews verify *how* the code works. This gate verifies *what* the feature does — from the user's perspective. Before a feature branch is merged, there must be evidence that each user story in the PRD was actually delivered: the right behaviors exist, the right flows work end-to-end, and screenshots capture the real UI state as proof.

Without this gate, teams merge branches that satisfy linting and unit tests but miss user-facing requirements documented in the PRD.

---

## Inputs

| Input | Source | Required |
|-------|--------|----------|
| PRD path | Passed in context by `subagent-driven-development` or `executing-plans`, or discovered automatically | Required |
| Feature name | Derived from PRD path | Required |
| Test runner command | Detected from project files | Required |
| Browser automation tool | Detected from project dependencies | Optional |

---

## Process

### Step 1: Discover PRD and Extract User Stories

Locate the PRD using this priority order:
1. **Explicit path** — if passed in context by `subagent-driven-development` or `executing-plans`
2. **Deterministic derivation** — `docs/superpowers/<feature-name>/prd/prd-<feature-name>.md`
3. **Directory scan** — files with `prd-` prefix in `docs/superpowers/<feature-name>/prd/`

**If no PRD is found:** Report `"No PRD found for this feature — skipping QA gate."` and return control to the caller without blocking.

Read the PRD and extract:
- All **Histórias de Usuário** (`Como [persona], eu quero [ação] para que [benefício]`)
- All **Requisitos Funcionais** (RF-001, RF-002...) and their mapping to each story
- The **Fora de Escopo** section — do not attempt to verify excluded features

Assign each user story a slug: `us-<N>-<first-5-words-kebab>` (e.g., `us-001-como-admin-eu-quero`).

### Step 2: Set Up QA Directory

Create the evidence directory tree before dispatching any subagents:

```
docs/superpowers/<feature-name>/
  qa/
    evidence/
      us-001-<story-slug>/
      us-002-<story-slug>/
      ...
```

### Step 3: Detect Project Capabilities

Gather this information **before** dispatching subagents so every subagent receives accurate context.

**Test runner** — check in order:
- `package.json` → inspect `scripts.test` (vitest, jest, playwright)
- `pyproject.toml` / `pytest.ini` → pytest
- `Cargo.toml` → cargo test
- `go.mod` → go test ./...

**Browser automation** — check in order:
- `@playwright/test` in `devDependencies` → Playwright ✅
- `puppeteer` in `dependencies` or `devDependencies` → Puppeteer ✅
- Neither found → Screenshots unavailable ⚠️ (note in report, do not fail)

**Acceptance test location** — where to save any new tests:
- Prefer an existing `e2e/`, `__tests__/`, `tests/`, `test/`, or `spec/` directory
- Match the project's naming convention (`.spec.ts`, `.test.ts`, `_test.go`, `_spec.rb`, etc.)
- When unsure, place new tests alongside the most closely related existing test file

### Step 4: Dispatch QA Subagents in Parallel

Launch one background subagent per user story **in a single turn** — all subagents run in parallel. Do not wait for one to finish before launching the next.

Give each subagent exactly this context:

---
```
You are a QA verification subagent. Your sole job is to verify that one user story has been implemented correctly and to collect evidence.

**User Story**: [full user story text]
**Associated Requirements**: [RF-001: ..., RF-002: ...]
**Feature PRD**: [path]
**Feature Spec**: [path]
**Test runner command**: [command, e.g. "npx vitest run"]
**Browser automation**: [Playwright | Puppeteer | not available]
**Evidence directory**: docs/superpowers/<feature-name>/qa/evidence/<us-slug>/

---

### Task 1 — Map to Existing Tests

Search the codebase for tests that cover this user story's behaviors. Look for files that:
- Test the components, functions, routes, or endpoints related to this story
- Assert outcomes described in its functional requirements (RF-XXX)

Run those tests:
```bash
[test runner command] [relevant files or pattern]
```

Save the complete output (stdout + stderr) to: `evidence/<us-slug>/test-output.txt`

---

### Task 2 — Create Missing Acceptance Tests (if needed)

If no existing test covers this user story (or coverage is clearly partial), write a minimal acceptance test that verifies the story's primary behavior end-to-end.

- Follow the project's test naming convention
- Save the new test file under the project's acceptance/e2e test directory
- Run it immediately to confirm it passes (or document if it fails and why)
- Save the file path(s) to: `evidence/<us-slug>/acceptance-tests-created.txt`

If comprehensive tests already exist, skip this task.

---

### Task 3 — Capture UI Screenshot (if browser automation is available)

If Playwright or Puppeteer is available:
- Write a minimal script that starts the app (if needed), navigates to the feature's primary UI state, and captures a screenshot
- The screenshot must show the feature described in the user story in its natural state
- Save the screenshot to: `evidence/<us-slug>/screenshot.png`
- Save the script to: `evidence/<us-slug>/screenshot-script.ts` (or `.js`)

If browser automation is **not** available, skip this task entirely — it does not affect the gate status.

---

### Task 4 — Write Result

Create `evidence/<us-slug>/result.json`:

```json
{
  "us_id": "us-001",
  "user_story": "[full story text]",
  "requirements": ["RF-001", "RF-002"],
  "status": "PASSED|FAILED|PARTIAL|UNVERIFIABLE",
  "existing_tests_found": true,
  "acceptance_tests_created": ["path/to/acceptance.spec.ts"],
  "test_output_summary": "15 tests passed, 0 failed",
  "screenshot_path": "evidence/<us-slug>/screenshot.png",
  "failure_details": null,
  "notes": ""
}
```

**Status guide:**
- `PASSED` — behavior verified (tests pass; screenshot captured if browser available)
- `FAILED` — tests fail, or a created acceptance test fails, or critical behavior is missing
- `PARTIAL` — tests pass but some aspect could not be verified (e.g., no browser for screenshot; test coverage exists but incomplete)
- `UNVERIFIABLE` — cannot locate or write tests for this story; document the reason clearly in `notes`
```
---

### Step 5: Collect Results and Generate QA Report

Wait for all subagents to complete. Read every `evidence/<us-slug>/result.json`.

**Compute overall status:**
- `PASSED` — all stories are `PASSED` or `PARTIAL` (zero `FAILED`)
- `FAILED` — one or more stories are `FAILED`
- `PARTIAL` — mix of `PASSED` and `UNVERIFIABLE` (zero `FAILED`)

Save the report to `docs/superpowers/<feature-name>/qa/qa-report-<feature-name>.md` using the template at `./assets/qa-report-template.md`:

```markdown
# QA Report — [Feature Name]

## Resumo
- **Data**: [ISO date]
- **Status**: ✅ APROVADO | ❌ REPROVADO | ⚠️ PARCIAL
- **PRD**: [relative path]
- **Total de Requisitos**: [X]
- **Requisitos Atendidos**: [Y / X]
- **Bugs Encontrados**: [Z]

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | [descrição] | ✅ PASSOU | `evidence/us-001-.../test-output.txt` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| [user story / flow description] | ✅ PASSOU | [obs] |

---

## Acessibilidade
- [ ] Navegação por teclado verificada
- [ ] Contraste de cores adequado
- [ ] Labels e ARIA roles presentes

---

## Bugs Encontrados

| ID | Descrição | Severidade | Screenshot |
|----|-----------|------------|------------|
| BUG-01 | [descrição] | Alta / Média / Baixa | `evidence/.../screenshot.png` |

---

## Conclusão
[Parecer final: feature pronta para merge / bloqueada por falhas / aprovada com ressalvas]
```

### Step 6: Gate Decision

**If status is `PASSED` or `PARTIAL`:**

```
✅ QA Gate passed — N/M user stories verified.
QA report saved to: docs/superpowers/<feature-name>/qa/qa-report-<feature-name>.md
Returning control to orchestrator.
```

Return control to `subagent-driven-development` or `executing-plans` to proceed to `finishing-a-development-branch`.

**If status is `FAILED`:**

```
❌ QA Gate failed — N user story(ies) did not pass verification.

Failed stories:
- US-002: [failure description]
- US-003: [failure description]

QA report: docs/superpowers/<feature-name>/qa/qa-report-<feature-name>.md

Cannot proceed with merge or PR until the failures above are addressed.
Fix the implementation, then re-run the orchestrator (subagent-driven-development or executing-plans).
```

**STOP.** Do not return control to the orchestrator for branch finishing. The orchestrator must not invoke `finishing-a-development-branch` until this gate is resolved.

---

## Red Flags

**Never:**
- Skip a user story — verify all stories listed in the PRD
- Mark a story `PASSED` without running at least one test or verifying a behavior
- Proceed to merge/PR options when gate status is `FAILED`
- Create evidence for features listed in "Fora de Escopo"
- Block the pipeline because screenshots are unavailable (browser automation is optional)

**Always:**
- Save `result.json` for every story, even `UNVERIFIABLE` ones
- Pass the complete PRD and spec content to each subagent so it has full context
- Create the evidence directories before dispatching subagents
- Include failure details and evidence paths in the report when status is `FAILED`

---

## Quick Reference

| Status | Meaning | Gate Decision |
|--------|---------|---------------|
| PASSED | All stories verified, tests pass | ✅ Continue |
| PARTIAL | Mix of PASSED + UNVERIFIABLE | ✅ Continue (with notes) |
| FAILED | At least one story fails | ❌ STOP |
| No PRD | PRD not found | ✅ Skip gate |

---

## Integration

**Invoked by:** `superpowers:subagent-driven-development` and `superpowers:executing-plans` — after all tasks complete and the final code reviewer approves, before `finishing-a-development-branch` is called  
**Artifacts saved to:** `docs/superpowers/<feature-name>/qa/`  
**Required context:** PRD path, feature name, test runner command  
**Optional context:** Playwright/Puppeteer availability
