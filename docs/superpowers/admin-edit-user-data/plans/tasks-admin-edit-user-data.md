# Tarefas: Edição de dados de usuários pelo administrador

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/admin-edit-user-data-design.md`
**PRD:** `../prd/prd-admin-edit-user-data.md`

**Goal:** Permitir que administradores editem dados de usuários (nome, email, status, role) respeitando uma matriz de autorização aplicada no backend (fonte da verdade) e espelhada no frontend para UX.

**Architecture:** Uma policy de domínio pura (`UserManagementPolicy`) centraliza a regra "quem pode alterar quê de quem"; os use cases existentes (UpdateUserProfile, Suspend, Activate, Promote, Demote) passam a receber o `requesterId`, carregar requester+target e consultar a policy antes de agir, retornando erro de domínio `forbidden` (HTTP 403). O frontend torna a aba Detalhes do `UserDetailPanel` editável inline, estende `resolvePermissions` com a mesma matriz e orquestra as mutations existentes mais uma nova mutation admin de atualização de nome/email.

**Tech Stack:** Backend — TypeScript, Clean Architecture/DDD, Inversify, Fastify, Zod, Either/Result, Vitest + supertest. Frontend — Next.js/React, TanStack Query, Zustand, shadcn/ui, Tailwind, Vitest + Testing Library + MSW. Tipos compartilhados via `@repo/api-types` (OpenAPI).

---

## Tarefas

- [ ] 1. Policy de domínio `UserManagementPolicy` + erro de autorização [FR-005, FR-006, FR-007, FR-008, FR-009, FR-010] → `task-01.md`
- [ ] 2. Autorização na edição de nome/email (UpdateUserProfile) [FR-005, FR-006, FR-007, FR-010, FR-011, FR-012] → `task-02.md`
- [ ] 3. Autorização na alteração de status (Suspend/Activate) [FR-005, FR-006, FR-007, FR-009, FR-012] → `task-03.md`
- [ ] 4. Autorização na alteração de role (Promote/Demote, root-only) [FR-006, FR-007, FR-008, FR-009, FR-012] → `task-04.md`
- [ ] 5. Expor `isSuperAdmin` no JWT e na resposta de GET /users [FR-002, FR-007] → `task-05.md`
- [ ] 6. Estender `resolvePermissions` com a matriz de autorização [FR-002, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010] → `task-06.md`
- [ ] 7. Mutation admin para editar nome/email de um usuário-alvo [FR-001, FR-003] → `task-07.md`
- [ ] 8. Aba Detalhes editável inline orquestrando as mutations [FR-001, FR-002, FR-003, FR-004, FR-007] → `task-08.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 5
- **Wave 2** (parallel): 2, 3, 4, 6, 7
- **Wave 3** (sequential): 8
