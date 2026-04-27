---
name: executar-review
description: Performs comprehensive code review by analyzing git diff, verifying conformance with project rules, validating test suites, and checking adherence to Tech Spec and Tasks. Generates a structured code review report with severity-classified findings. Use when the user asks for a code review, wants to validate code quality, or needs pre-merge verification. Do not use for QA testing, bug fixing, or task implementation.
---

# Code Review Execution

## Procedures

**Step 1: Documentation Analysis (Mandatory)**
1. Read the Tech Spec at `./tasks/prd-[feature-slug]/techspec.md` to understand expected architectural decisions.
2. Read the Tasks at `./tasks/prd-[feature-slug]/tasks.md` to verify the scope implemented.
3. Read the project rules to know the required standards.
4. Do NOT skip this step — understanding context is fundamental for the review.

**Step 2: Code Change Analysis (Mandatory)**
1. Run git commands to understand what changed:
   - `git status` to see modified files.
   - `git diff` and `git diff --staged` to see all changes.
   - `git log main..HEAD --oneline` to see branch commits.
   - `git diff main...HEAD` for the full branch diff.
2. For each modified file:
   a. Analyze changes line by line.
   b. Verify adherence to project standards.
   c. Identify potential issues.
3. Read the full context of modified files, not just the diff.

**Step 3: Rules Conformance Verification (Mandatory)**
1. For each code change, verify:
   - Naming conventions per project rules.
   - Project folder structure adherence.
   - Code standards (formatting, linting).
   - No unauthorized dependencies introduced.
   - Error handling patterns.
   - Language conventions (Portuguese/English as defined).

**Step 4: Tech Spec Adherence Verification (Mandatory)**
1. Compare implementation against the Tech Spec:
   - Architecture implemented as specified.
   - Components created as defined.
   - Interfaces and contracts follow specification.
   - Data models as documented.
   - Endpoints/APIs as specified.
   - Integrations implemented correctly.

**Step 5: Task Completeness Verification (Mandatory)**
1. For each task marked as complete:
   - Corresponding code was implemented.
   - Acceptance criteria were met.
   - Subtasks were all completed.
   - Task tests were implemented.

**Step 6: Test Execution (Mandatory)**
1. Run the test suite.
2. Run type checking.
3. Verify:
   - All tests pass.
   - New tests added for new code.
   - Coverage did not decrease.
   - Tests are meaningful (not just for coverage).
4. The review CANNOT be approved if any test fails.

**Step 7: Code Quality Analysis (Mandatory)**
1. Read `references/code-quality-checklist.md` for the full checklist.
2. Assess: complexity, DRY, SOLID, naming, comments, error handling, security, performance.

**Step 8: Generate Review Report (Mandatory)**
1. Read the report template at `assets/review-report-template.md`.
2. Fill in all sections with actual findings.
3. Apply approval criteria:
   - **APPROVED**: All criteria met, tests passing, code conforms to rules and Tech Spec.
   - **APPROVED WITH OBSERVATIONS**: Main criteria met, minor or few non-blocking major issues.
   - **REJECTED**: Tests failing, severe rule violations, Tech Spec non-adherence, or security issues.

## Error Handling
- If no git changes are found, report that there is nothing to review.
- If tests fail, the review status MUST be REJECTED regardless of other findings.
- Check if there are files that SHOULD have been modified but were not.
- Be constructive in criticism — always suggest alternatives.