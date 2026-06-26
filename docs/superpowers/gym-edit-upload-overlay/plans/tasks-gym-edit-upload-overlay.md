# Tarefas: gym-edit-upload-overlay

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-edit-upload-overlay-design.md`
**PRD:** `../prd/prd-gym-edit-upload-overlay.md`

**Goal:** Substituir o bloco de upload da tela de edição por um overlay de ícone sobre a imagem de capa com upload imediato via Dialog, e adicionar botão Cancelar ao formulário.

**Architecture:** Novo componente `GymImageEditOverlay` encapsula GymImage + ícone Pencil + input oculto + Dialog com Cropper + chamada imediata a `useSetGymImage`. O `EditGymForm` troca `GymImage` + `GymImageUploader` por `GymImageEditOverlay`, remove o estado `imageBlob` e a lógica de upload do submit, e adiciona botão Cancelar na row de ações.

**Tech Stack:** Next.js 16, React 19, TanStack Query, shadcn/ui (Dialog, Button), react-easy-crop, Tailwind CSS v4, Vitest + Testing Library + MSW

---

## Tarefas

- [x] 1. Criar GymImageEditOverlay: componente, testes e handler MSW [FR-005, FR-006, FR-007, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015] → `task-01.md`
- [x] 2. Atualizar EditGymForm: cancelar, troca de componente de imagem e desacoplamento do upload [FR-001, FR-002, FR-003, FR-004, FR-008, FR-016] → `task-02.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
