# Tarefas: Content Width Standardization

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/content-width-standardization-design.md`
**PRD:** `../prd/prd-content-width-standardization.md`

**Goal:** Padronizar a largura do conteúdo das telas autenticadas com um sistema de 3 tiers (`wide`/`default`/`narrow`) alinhados à esquerda, aplicados por um componente único `PageContainer`, eliminando o "pulo" da borda esquerda ao navegar.

**Architecture:** Um componente `PageContainer` encapsula largura + alinhamento à esquerda + ritmo vertical, sem re-aplicar o padding horizontal (responsabilidade do shell). Cada `page.tsx` autenticado troca seu wrapper ad-hoc (`mx-auto max-w-* px-* py-*`) por `<PageContainer width="...">`. Telas públicas de auth ficam intactas.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, `cn` (clsx + tailwind-merge), Vitest + Testing Library, Playwright.

---

## Tarefas

- [x] 1. Criar componente `PageContainer` + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009] → `task-01.md`
- [x] 2. Migrar telas tier `wide` (Dashboard, Academias, Admin Usuários) [RF-011, RF-014, RF-016] → `task-02.md`
- [x] 3. Migrar telas tier `default` (Check-ins, Admin Check-ins, Perfil, Perfil público, Assinatura, Detalhe academia) [RF-012, RF-014, RF-016] → `task-03.md`
- [x] 4. Migrar telas tier `narrow` (Cadastrar academia, Trocar senha) [RF-013, RF-014] → `task-04.md`
- [x] 5. Verificação visual (borda esquerda) + auth intacta + gate final [RF-010, RF-015, RF-016] → `task-05.md`

## Execution Waves

- **Wave 1** (sequential): 1
- **Wave 2** (parallel): 2, 3, 4
- **Wave 3** (sequential): 5
