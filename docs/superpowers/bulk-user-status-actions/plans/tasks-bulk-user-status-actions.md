# Tarefas: Ações em Massa (Ativar/Desativar) na Listagem de Usuários

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/bulk-user-status-actions-design.md`
**PRD:** `../prd/prd-bulk-user-status-actions.md`

**Goal:** Permitir que um administrador selecione múltiplos usuários na listagem `/admin/usuarios` e aplique Ativar ou Desativar de uma vez, persistido como uma única escrita em lote no banco de dados, idempotente e revalidada por política de autorização no servidor.

**Architecture:** Backend: `BulkChangeUserStatusUseCase` busca requester + candidatos, filtra em memória via `UserManagementPolicy.canChangeStatus` (reaproveitada, não duplicada), e aplica um único `updateMany` com `where: { id: { in: eligibleIds }, status: { not: targetStatus } }` (idempotência + desbloqueio automático de `locked` ao ativar). Duas rotas dedicadas (`PATCH /users/bulk-activate`, `PATCH /users/bulk-deactivate`) espelham o padrão de rota único já usado por `ActivateUserController`/`SuspendUserController`. Frontend: estado de seleção (`Set<string>`) em `AdminUsersContent`, checkbox por linha em `UserRow` (desabilitado via `resolvePermissions`), nova `BulkActionBar` fixa no rodapé, novo `BulkStatusConfirmationDialog` (AlertDialog), e um novo hook `useBulkChangeUserStatus` (TanStack Query mutation) reaproveitando o padrão de `useActivateUser`.

**Tech Stack:** TypeScript, Fastify, Prisma, Inversify (backend); Next.js 16, React 19, TanStack Query v5, shadcn/ui (Radix), Tailwind, sonner (frontend); Vitest + `InMemoryUserRepository` (unit), business-flow HTTP tests (backend), Vitest + Testing Library + MSW (frontend).

---

## Tarefas

- [ ] 1. Estender UserRepository com busca por IDs e atualização em massa [FR-007, FR-009] → `task-01.md`
- [ ] 2. BulkChangeUserStatusUseCase — revalidação de política de autorização [FR-009] → `task-02.md`
- [ ] 3. BulkChangeUserStatusUseCase — escrita idempotente, desbloqueio e resposta agregada [FR-006, FR-007, FR-008, FR-010] → `task-03.md`
- [ ] 4. BulkActivateUsersController e rota PATCH /users/bulk-activate [FR-007, FR-012] → `task-04.md`
- [ ] 5. BulkDeactivateUsersController e rota PATCH /users/bulk-deactivate [FR-007, FR-012] → `task-05.md`
- [ ] 6. UserRow — checkbox de seleção com suporte a desabilitado [FR-001, FR-003] → `task-06.md`
- [ ] 7. AdminUsersContent — estado de seleção e checkbox de página indeterminado [FR-001, FR-002] → `task-07.md`
- [ ] 8. AdminUsersContent — limpar seleção ao mudar página/filtro/busca [FR-011] → `task-08.md`
- [ ] 9. BulkActionBar — barra de ações fixa no rodapé [FR-004] → `task-09.md`
- [ ] 10. BulkStatusConfirmationDialog — diálogo de confirmação [FR-005] → `task-10.md`
- [ ] 11. useBulkChangeUserStatus — hook de mutation com resumo e invalidação de cache [FR-007, FR-010] → `task-11.md`
- [ ] 12. AdminUsersContent — integração final (barra + diálogo + hook) [FR-004, FR-005] → `task-12.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 6, 9, 10, 11
- **Wave 2** (parallel): 2, 7
- **Wave 3** (parallel): 3, 8
- **Wave 4** (parallel): 4, 12
- **Wave 5** (sequential): 5
