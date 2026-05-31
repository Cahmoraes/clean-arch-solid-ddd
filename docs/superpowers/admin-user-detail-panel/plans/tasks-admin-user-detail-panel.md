# Tarefas: Painel de Detalhes do Usuário (Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below), or super.executing-plans to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/admin-user-detail-panel-design.md`
**PRD:** `../prd/prd-admin-user-detail-panel.md`

**Goal:** Substituir o `UserDetailModal` por um painel de detalhes com abas (Detalhes/Permissões/Atividade) renderizado em split-view inline no desktop e em Dialog bottom-sheet no mobile, reaproveitando a lógica de ações administrativas existente.

**Architecture:** Um componente puro `UserDetailPanel` (header + Tabs + rodapé de ações) é compartilhado entre um container responsivo que decide, via hook `useIsDesktop`, entre renderizar o painel numa coluna (desktop ≥768px) ou dentro de um `Dialog` (mobile <768px). A lógica de mutations/permissões/confirmações do modal atual é extraída para um hook reutilizável `useUserDetailActions`. A página de usuários ganha o layout de duas colunas, estado de seleção e destaque da linha ativa.

**Tech Stack:** Next.js 16 (App Router), React 19, shadcn/ui (Radix Tabs/Dialog/AlertDialog), TanStack Query, Tailwind CSS v4, Vitest + Testing Library + MSW.

---

## Tarefas

- [ ] 1. Hook `useIsDesktop` (responsividade) [RF-002, RF-003] → `task-01.md`
- [ ] 2. Extrair `useUserDetailActions` + ConfirmationDialogs [RF-014, RF-016, RF-018] → `task-02.md`
- [ ] 3. `DetailsTab` + helpers de formatação [RF-008, RF-011] → `task-03.md`
- [ ] 4. `PermissionsTab` [RF-009] → `task-04.md`
- [ ] 5. `ActivityTab` (estado vazio gracioso) [RF-010, RF-011] → `task-05.md`
- [ ] 6. `UserActionsFooter` (ações + confirmações + excluir desabilitado) [RF-014, RF-015, RF-016, RF-017, RF-018, RF-019] → `task-06.md`
- [ ] 7. `UserDetailPanel` (header + Tabs + footer) [RF-007, RF-012, RF-013, RF-022] → `task-07.md`
- [ ] 8. `UserDetailContainer` responsivo (split-view vs Dialog + EmptyState) [RF-001, RF-002, RF-003, RF-006, RF-021] → `task-08.md`
- [ ] 9. Integração `page.tsx` + `user-row.tsx` (layout, seleção, linha ativa, teclado) [RF-001, RF-004, RF-005, RF-020] → `task-09.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3, 5
- **Wave 2** (parallel): 4, 6
- **Wave 3** (sequential): 7
- **Wave 4** (sequential): 8
- **Wave 5** (sequential): 9
