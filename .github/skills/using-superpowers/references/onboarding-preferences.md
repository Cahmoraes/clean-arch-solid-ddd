# Workflow Preferences Onboarding

This guide is triggered when `.superpowers/preferences.yml` does not exist in the user's repository.

## Trigger

The `using-superpowers` skill detects the absence of `.superpowers/preferences.yml` in the user's repository root.

## Wizard Flow

Follow these steps in order, **one question at a time**:

### Step 1 — Inform

Tell the user:
> "I couldn't find your workflow preferences (`.superpowers/preferences.yml`). I'll ask a few quick questions to configure agent behavior for this project."

### Step 2 — Auto-commit

Ask:
> "Would you like subagents to automatically commit after completing each task?"
> - **Yes** (default) — commits are made automatically
> - **No** — you will commit manually

Record the answer as `workflow.auto_commit` (true/false).

### Step 3 — Language

Ask:
> "What language do you prefer for agent communication?"
> - **pt-BR** (default)
> - **en**
> - **es**
> - Other (specify)

Record the answer as `communication.language`.

### Step 4 — Destructive Action Confirmation

Ask:
> "Would you like agents to ask for confirmation before destructive actions (deleting files, overwriting content)?"
> - **Yes** (default) — always ask for confirmation
> - **No** — execute without asking

Record the answer as `workflow.confirm_destructive_actions` (true/false).

### Step 5 — Corporate Artifacts (Optional)

Ask:
> "Do you have any corporate artifacts that could help me understand the project better? For example: PRDs, technical specs, UML diagrams, user stories, wikis, data mappings, API contracts, ADRs, or design mockups created by your team?"
> - **Yes** — please share them
> - **No** — skip this step

If the user says **yes**, collect all references they provide:
- **Local file paths** (e.g., `./docs/prd.md`, `../specs/architecture.md`)
- **Public URLs** (e.g., `https://wiki.company.com/product-spec`)
- **Inline content** (pasted directly in the chat)

For inline content, warn the user:
> "Inline content is available for this session only. To use these artifacts in future sessions, save them to a file and provide the path."

For paths and URLs, create `.superpowers/corporate-artifacts.yml` in the repository root with the following format:

```yaml
# Superpowers Corporate Artifacts
# Collected during onboarding. Edit manually or ask the agent to update.
# Entries are local paths or public URLs to corporate documents.
items:
  - <path-or-url>
```

Then set `context.has_corporate_artifacts: true` in the preferences before saving in the next step.

If the user says **no** or provides nothing, leave `context.has_corporate_artifacts: false` (default) and do NOT create the corporate-artifacts.yml file.

> **Why this matters:** Corporate artifacts contain business constraints, validated user stories, design decisions, and domain context that the agent cannot discover through codebase exploration alone. When provided, they significantly improve the quality of brainstorming questions, research, and PRD generation.

### Step 6 — Generate and Save

1. Read the template from `../template/preferences.md` to get the YAML structure
2. Fill in the placeholders with the answers collected in the previous steps
3. Create the `.superpowers/` directory if it doesn't exist
4. Save to `.superpowers/preferences.yml`
5. Confirm:
> "Preferences saved to `.superpowers/preferences.yml`. You can edit them manually at any time or ask me to update them."

### Step 7 — Opening Triage

Immediately after saving preferences, decide whether to ask the opening question or route straight into a flow.

- If the session started with a greeting, a generic request for help, or no concrete task yet, ask the opening question in the chosen language.
- If the user's message already maps cleanly to a single superpowers flow, skip the opening question and hand off directly using `using-superpowers` routing rules.

English baseline wording:
> "How can I help? I can route us into brainstorming, debugging, planning an approved spec, execution, or review."

pt-BR baseline wording:
> "Como posso te ajudar? Posso te encaminhar para brainstorming, debugging, planejamento de um spec ja aprovado, execucao ou review."

## Generated YAML Structure

The full YAML template is in `../template/preferences.md`. The structure is:

```yaml
workflow:
  auto_commit: <true|false>
  confirm_destructive_actions: <true|false>

communication:
  language: <language-code>

copilot:
  rubber_duck: <true|false>   # Copilot CLI only — ignored by other tools

context:
  has_corporate_artifacts: <true|false>   # true when .superpowers/corporate-artifacts.yml was created
```

## Field Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `workflow.auto_commit` | bool | `true` | Subagents commit automatically after each task |
| `workflow.confirm_destructive_actions` | bool | `true` | Ask for confirmation before deleting/overwriting files |
| `communication.language` | string | `pt-BR` | Language for agent communication |
| `copilot.rubber_duck` | bool | `false` | Forces Rubber Duck at every critical checkpoint. When `false` (or absent), Copilot CLI decides when to invoke it automatically — Copilot CLI only |
| `context.has_corporate_artifacts` | bool | `false` | When `true`, the agent reads `.superpowers/corporate-artifacts.yml` to load corporate artifact references for brainstorming and PRD generation |

## Runtime Mutability

If the user requests a preference change during a session (e.g., "set auto_commit to false"):
1. Read the current file
2. Update only the requested key
3. Save the file
4. Confirm the change to the user

**Rule:** Never change preferences without explicit user request.

## Reading Rules

- Missing preference key → use default value (see Field Reference table above and template at `../template/preferences.md`)
- Unknown keys → ignored (forward-compatible)
- Malformed file (invalid YAML) → warn the user, assume all defaults, offer to recreate

## Compatibility Notes

- Unknown keys are **ignored** (forward-compatible).
- The `copilot:` section is designed for Copilot CLI-specific settings. Other AI tools that read this file will silently ignore these keys.

## Copilot CLI: Rubber Duck Additional Step

If running in **Copilot CLI**, add this step **after Step 4** (before Step 5 — Corporate Artifacts):

> "By default, Copilot CLI decides when to invoke the **Rubber Duck Agent** automatically. You can override this to guarantee it runs at every critical checkpoint (after plan draft, after complex implementations, after writing tests).
>
> Would you like to force Rubber Duck at every checkpoint?"
> - **No** (default) — Copilot CLI decides when to invoke Rubber Duck
> - **Yes** — guarantee Rubber Duck is invoked at every defined checkpoint

Record the answer as `copilot.rubber_duck` (true/false) in the generated YAML.

Agents on other platforms (Claude Code, Codex, Gemini CLI) **must skip this step** — they do not have the Rubber Duck Agent.

For full instructions on using Rubber Duck at the correct checkpoints, see `copilot-tools.md`.
