---
name: generating-prd
description: "Generates a PRD (Product Requirements Document) from a validated design spec. Invoked automatically after brainstorming approves a spec and before writing-plans begins. Use when transitioning from design exploration to implementation planning — the PRD formalizes user stories, functional requirements, and scope boundaries so that writing-plans can produce a more precise and traceable implementation plan."
---

# Generating PRD

Produce a structured PRD from the validated design spec, bridging the gap between creative exploration (brainstorming) and implementation planning (writing-plans).

## Why This Stage Exists

The brainstorming skill explores *what* to build and *why* — producing a design spec focused on architecture, components, and trade-offs. But a design spec is not a requirements document. Before writing-plans breaks work into granular tasks, we need a clear contract of **user stories**, **functional requirements**, and **scope boundaries** that an implementation plan can trace back to. The PRD serves this purpose: it's the accountability layer between "we agreed on a design" and "here's how to build it."

Without a PRD, writing-plans must infer requirements from the design spec — which works, but loses traceability and makes it harder to verify that the plan covers all user-facing needs.

## When This Skill Is Invoked

This skill activates in the pipeline **after** the user approves the design spec (brainstorming step 8) and **before** writing-plans is invoked (brainstorming step 9). The brainstorming skill orchestrates this transition.

```
brainstorming (spec approved) → generating-prd → writing-plans
```

If the user explicitly skips PRD generation (e.g., says "skip PRD", "go straight to planning"), respect that and proceed directly to writing-plans.

## Inputs

| Source | What it provides |
|--------|-----------------|
| Design spec (from brainstorming) | Architecture, components, data flow, error handling, testing approach |
| Brainstorming conversation context | User intent, constraints, decisions made, trade-offs chosen |

You already have both — the design spec was just written and reviewed in the same session.

## Process

**Announce at start:** "I'm using the generating-prd skill to formalize requirements before planning implementation."

### 1. Assess Need for Additional Clarification

The brainstorming phase already performed deep clarification. However, a PRD requires specific artifacts (user stories, acceptance criteria, measurable objectives) that the design spec may not have captured explicitly.

Scan the design spec for:
- Are user personas and their goals clearly identified?
- Are success metrics stated?
- Are scope boundaries (what's in, what's out) explicit?

If any critical gaps exist, ask **at most 2-3 focused questions** to fill them. Do not repeat the full clarification cycle — brainstorming already did that work.

**Escape hatch:** If multiple critical PRD inputs are missing (no personas, no metrics, no scope boundaries), this suggests brainstorming was incomplete. In that case, inform the user: "The design spec is missing key product inputs needed for the PRD. I recommend revisiting brainstorming to clarify [specific gaps] before generating the PRD." Let the user decide whether to proceed with assumptions or go back.

### 2. Draft the PRD

Use the standard PRD template structure:

```markdown
---
created_at: "YYYY-MM-DDTHH:MM:SS±HH:MM"
updated_at: "YYYY-MM-DDTHH:MM:SS±HH:MM"
---

# PRD: [Feature Name]

## Visão Geral
[High-level summary: what problem this solves, for whom, and why it matters]

## Objetivos
[Specific, measurable goals — how success looks, key metrics]

## Histórias de Usuário
[User stories in "Como [persona], eu quero [ação] para que [benefício]" format]
- Cover primary and secondary personas
- Include main flows and edge cases

## Funcionalidades Principais
[For each feature:
- What it does
- Why it matters
- How it works at a high level
- Numbered functional requirements (RF-001, RF-002, ...)]

## Experiência do Usuário
[User journey, main interaction flows, UI/UX considerations, accessibility requirements]

## Restrições Técnicas de Alto Nível
[Only high-level constraints — no implementation design:
- Required integrations
- Compliance/security mandates
- Performance/scalability goals
- Data sensitivity considerations]

## Fora de Escopo
[Explicitly excluded features, future considerations, boundaries]
```

**Principles while drafting:**
- Focus on **WHAT** and **WHY**, never on **HOW** (implementation belongs to tech spec / writing-plans)
- Every functional requirement must be testable and unambiguous
- User stories must be traceable — writing-plans will map tasks to these stories
- Keep the PRD under 2,000 words — concise and actionable

**Frontmatter date rules:**
- If the file **does not exist yet**: set both `created_at` and `updated_at` to the current date/time from the host clock (see script below), in ISO 8601 format with timezone (e.g., `"2026-05-07T16:54:36-03:00"`). Never write the literal placeholder in the document.
- If the file **already exists**: preserve the existing `created_at` value and update only `updated_at` to the current date/time.

> **Deterministic frontmatter (preferred):**
> ```bash
> # Preserve created_at if file exists:
> node ../brainstorming/scripts/frontmatter-utils.js --file <prd-path> --get-key created_at
> # Update updated_at using the host clock:
> node ../brainstorming/scripts/frontmatter-utils.js --file <prd-path> --set-key updated_at --set-value "$(node ../brainstorming/scripts/get-current-datetime.js)"
> ```
> **Fallback:** Write frontmatter manually.

### 3. Save the PRD

Save in the feature's `prd/` subdirectory, deriving the path from the spec location:

- The spec lives at `docs/superpowers/<feature-name>/specs/<feature-name>-design.md`
- The PRD goes to `docs/superpowers/<feature-name>/prd/prd-<feature-name>.md`
- Example: spec at `docs/superpowers/toggle-light-dark-theme/specs/toggle-light-dark-theme-design.md` → PRD at `docs/superpowers/toggle-light-dark-theme/prd/prd-toggle-light-dark-theme.md`
- If the feature directory structure doesn't exist yet, create it

**Pass the exact PRD path forward in context** so that `writing-plans` doesn't need to rediscover it. State explicitly: "PRD saved to `<path>`. This path will be provided to writing-plans."

(User preferences for PRD location override this default.)

### 4. Self-Review

Quick inline check before presenting to the user:

1. **Completeness**: Every section filled? No placeholders or TBDs?
2. **Traceability**: Can each functional requirement be traced to a user story?
3. **No implementation**: Does any section prescribe HOW to build something? Remove it.
4. **Measurability**: Are objectives and acceptance criteria measurable?
5. **Consistency with spec**: Does the PRD contradict the design spec in any way?

Fix issues inline.

### 5. User Review

Present the PRD to the user:

> "PRD generated and saved to `<path>`. Please review it — particularly the user stories and functional requirements. These will directly inform the implementation plan. Any changes before we proceed to planning?"

Wait for approval. If changes requested:
- **Clarification-only edits** (rewording, adding detail, fixing ambiguity): apply them and re-run self-review.
- **Scope/architecture changes** (adding features, changing behavior, modifying boundaries): flag that these conflict with the approved design spec. Ask: "This change affects scope/architecture. Should I update the design spec to match, or revert the PRD change?" The design spec remains the source of truth for architecture; the PRD is authoritative for user-facing requirements within that architecture.

Only proceed once approved.

### 6. Transition to Writing-Plans

After PRD is approved, invoke the `writing-plans` skill. The PRD path is now available in context for writing-plans to consume.

## Key Principles

- **Leverage prior work** — brainstorming already clarified intent; don't re-ask what's been answered
- **Accountability layer** — the PRD is the contract that writing-plans implements against
- **Traceable requirements** — numbered functional requirements (RF-001...) enable plan-to-requirement mapping
- **No implementation** — if you catch yourself writing "use X library" or "implement via Y pattern", stop and remove it
- **User stories drive tasks** — writing-plans will decompose user stories into implementable tasks
