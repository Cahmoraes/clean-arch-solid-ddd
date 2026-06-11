# Tarefas: Soft Delete de Usuário (Admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below), or super.executing-plans to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/user-soft-delete-design.md`
**PRD:** `../prd/prd-user-soft-delete.md`

**Goal:** Permitir que um administrador exclua logicamente (soft delete) uma conta de usuário pelo painel de detalhes, fazendo o usuário desaparecer de todas as leituras (lista, estatísticas, autenticação) sem remover seus dados do banco.

**Architecture:** Backend Clean Architecture + DDD. Adiciona um campo ortogonal `deleted_at` ao `User` (sem novo status), filtra `deleted_at = null` no ponto único das leituras do repositório (cobrindo login/perfil/mutações automaticamente) e nos DAOs analíticos. O `DeleteUserUseCase` é reescrito de hard delete para soft delete com guardas (auto-exclusão e super admin) seguindo o padrão de `DemoteFromAdminUseCase`. Endpoint `DELETE /users/:userId` (admin-only). Frontend integra um hook TanStack Query `useDeleteUser`, diálogo de confirmação destrutivo e habilita o botão "Excluir" do rodapé de ações.

**Tech Stack:** Fastify, Inversify, Prisma, Either pattern, Zod, Vitest, supertest (backend); Next.js, React, TanStack Query, openapi-fetch, shadcn/ui AlertDialog, Zustand, Vitest + MSW (frontend).

---

## Tarefas

- [x] 1. Schema Prisma + migração `deleted_at` [RF-001, RF-006] → `task-01.md`
- [x] 2. Entidade `User`: campo `deletedAt`, método `delete()`, getter `isDeleted` [RF-001, RF-002] → `task-02.md`
- [x] 3. Repositórios (Prisma/InMemory/SQLite): soft delete + filtro de leitura `deleted_at = null` [RF-003, RF-006] → `task-03.md`
- [x] 4. DAOs (Prisma/InMemory): excluir soft-deleted de listagem e estatísticas [RF-004, RF-005] → `task-04.md`
- [x] 5. `CannotDeleteSelfError` + reescrita do `DeleteUserUseCase` (soft delete + guardas + cache) [RF-007, RF-008, RF-009, RF-010, RF-015] → `task-05.md`
- [x] 6. `DeleteUserController` + rota `DELETE /users/:userId` + IoC + bootstrap [RF-011, RF-012, RF-013, RF-014] → `task-06.md`
- [x] 7. Teste de autenticação: usuário soft-deleted não autentica (senha + Google) [RF-003] → `task-07.md`
- [x] 8. Teste business-flow do `DELETE /users/:userId` [RF-011, RF-012, RF-013, RF-014, RF-015] → `task-08.md`
- [x] 9. Gerar tipos compartilhados (`generate:types`) com `DELETE /users/{userId}` [RF-018] → `task-09.md`
- [x] 10. Hook `useDeleteUser` + teste [RF-018, RF-020] → `task-10.md`
- [x] 11. `DeleteConfirmationDialog` em `confirmation-dialogs.tsx` [RF-017] → `task-11.md`
- [x] 12. Integrar exclusão no painel: `useUserDetailActions` + `user-actions-footer` + fechar painel + testes [RF-016, RF-019, RF-018] → `task-12.md`

## Ondas de Execução

<!-- Derivado dos campos **Depends on:** de cada task via agrupamento topológico. -->

- **Wave 1** (parallel): 1, 2, 11
- **Wave 2** (parallel): 3, 4
- **Wave 3** (parallel): 5, 7
- **Wave 4** (sequential): 6
- **Wave 5** (parallel): 8, 9
- **Wave 6** (sequential): 10
- **Wave 7** (sequential): 12
