# Tarefas: user-profile-enrichment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/user-profile-enrichment-design.md`
**PRD:** `../prd/prd-user-profile-enrichment.md`

**Goal:** Enriquecer a tela `/perfil` expondo `createdAt`/`status` do backend, criar `PATCH /users/me` para editar nome, e redesenhar o frontend com cartão compacto + modal de edição.

**Architecture:** Clean Architecture mínima no backend — apenas enriquecer o output do `UserProfileUseCase` existente e criar um `UpdateMyProfileUseCase` enxuto. Regenerar shared types via `pnpm generate:types`. Frontend usa TanStack Query (mutation + cache invalidation) e um novo componente `EditProfileModal`.

**Tech Stack:** Backend: Fastify, Inversify IoC, Zod, Either pattern. Frontend: Next.js 16, React 19, TanStack Query, shadcn/ui, Tailwind CSS, Zod.

---

## Tarefas

- [ ] 1. Enriquecer `UserProfileUseCase` e `MyProfileController` [RF-001, RF-002, RF-005] → `task-01.md`
- [ ] 2. Criar `UpdateMyProfileUseCase` e `UpdateMyProfileController` [RF-009, RF-010] → `task-02.md`
- [ ] 3. Regenerar shared API types [RF-005, RF-009, RF-010] → `task-03.md`
- [ ] 4. Adicionar hook `useUpdateProfile` no frontend [RF-006, RF-009, RF-010] → `task-04.md`
- [ ] 5. Redesenhar página `/perfil` [RF-001, RF-002, RF-003, RF-004] → `task-05.md`
- [ ] 6. Criar `EditProfileModal` e integrar na página [RF-006, RF-007, RF-008, RF-009, RF-010] → `task-06.md`
