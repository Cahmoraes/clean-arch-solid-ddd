# Tarefas: Refinamentos Visuais — Listagem de Usuários (Admin)

**Spec:** `../specs/admin-users-visual-refinements-design.md`
**PRD:** `../prd/prd-admin-users-visual-refinements.md`

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui · Vitest ·
runner de arquivo único, de dentro de `apps/frontend`: `pnpm exec vitest run <arquivo>`

---

## Tarefas

- [x] 1. Status vira faixa lateral; badge de papel único [FR-001, FR-002] → `task-01.md`
- [x] 2. Cor de seleção destaque vs. marcado + contraste do e-mail [FR-003, FR-004, FR-005] → `task-02.md`
- [ ] 3. Transição suave do painel de detalhes (split-view) [FR-006, FR-007] → `task-03.md`

## Ondas de Execução

Cadeia sequencial: Task 2 depende da Task 1 (mesmo arquivo `user-row.tsx`); Task 3 depende
da Task 2 por ordem declarada, embora toque arquivos independentes.

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (sequential): 3
