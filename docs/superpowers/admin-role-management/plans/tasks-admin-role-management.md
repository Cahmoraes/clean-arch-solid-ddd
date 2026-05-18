# Tarefas: Admin Role Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/admin-role-management-design.md`
**PRD:** `../prd/prd-admin-role-management.md`

**Goal:** Permitir que administradores promovam membros a admin e revoguem privilégios de admins via modal na tela `/admin/usuarios`.

**Architecture:** Backend — dois Use Cases dedicados (`PromoteToAdminUseCase`, `DemoteFromAdminUseCase`) com controladores e rotas protegidas por JWT + onlyAdmin. Frontend — dois hooks de mutação com optimistic update + atualização do `UserDetailModal` com seção "Permissões".

**Tech Stack:** Backend: TypeScript, Inversify IoC, Fastify, Zod, Either pattern. Frontend: React 19, TanStack Query, shadcn/ui.

---

## Tarefas

- [ ] 1. Domínio — método `updateRole` na entidade User + 5 erros de domínio [RF-001, RF-008] → `task-01.md`
- [ ] 2. Backend — `PromoteToAdminUseCase` + testes unitários [RF-001, RF-004, RF-005, RF-006, RF-007] → `task-02.md`
- [ ] 3. Backend — `DemoteFromAdminUseCase` + testes unitários [RF-008, RF-011, RF-012, RF-013] → `task-03.md`
- [ ] 4. Backend — Rotas, IoC, Controllers, Bindings [RF-001, RF-007, RF-008, RF-013] → `task-04.md`
- [ ] 5. Backend — Business flow tests para ambas as rotas [RF-001, RF-007, RF-008, RF-013] → `task-05.md`
- [ ] 6. Frontend — Hook `usePromoteToAdmin` + testes [RF-001, RF-002, RF-003] → `task-06.md`
- [ ] 7. Frontend — Hook `useDemoteFromAdmin` + testes [RF-008, RF-009, RF-010] → `task-07.md`
- [ ] 8. Frontend — Atualização do `UserDetailModal` com seção Permissões + testes [RF-014, RF-015, RF-016, RF-017] → `task-08.md`
