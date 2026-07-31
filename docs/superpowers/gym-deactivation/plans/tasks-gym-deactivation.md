# Tarefas: Desativação/Reativação de Academia

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/gym-deactivation-design.md`
**PRD:** `../prd/prd-gym-deactivation.md`

**Goal:** Permitir que um administrador desative e reative uma academia (sem exclusão física), ocultando-a de todo caminho de leitura e do check-in para usuários comuns, com indicação visual para admins.

**Architecture:** Segue o padrão State já usado em `User`/`UserStatus` (agora aplicado a `Gym`/`GymStatus`), mas com transições que retornam `Either<ConflictError, void>` em vez de no-op silencioso (Decisão D3 da spec). O filtro `includeInactive` é decidido pelo chamador em cada nível (controller → use case → repository), nunca aplicado implicitamente (Decisão D1). Os 3 controllers de leitura de academia, hoje sem nenhuma proteção, passam a exigir `isProtected: true` (sem `onlyAdmin`) para que o backend saiba o papel do requisitante.

**Tech Stack:** NestJS-style/Fastify + Inversify (backend), Prisma (PostgreSQL/PostGIS), Vitest; Next.js + TanStack Query + shadcn/Radix `AlertDialog` (frontend).

---

## Tarefas

- [ ] 1. Migration Prisma — enum `GymStatus` (activated/deactivated) + campo `status` em `Gym` [FR-011] → `task-01.md`
- [ ] 2. Domain: `GymStatus` value object (state pattern) + erros de conflito [FR-010] → `task-02.md`
- [ ] 3. Entidade `Gym` — campo/getter `status` + `deactivate()`/`activate()` [FR-001, FR-002, FR-011] → `task-03.md`
- [ ] 4. `GymRepository` (interface + Prisma + in-memory) — persiste `status` e filtra por `includeInactive` [FR-006, FR-008, FR-009, FR-011] → `task-04.md`
- [ ] 5. `DeactivateGymUseCase` [FR-001, FR-005, FR-010, FR-011] → `task-05.md`
- [ ] 6. `ActivateGymUseCase` [FR-002, FR-005, FR-010, FR-011] → `task-06.md`
- [ ] 7. `FetchAllGymsUseCase` — `includeInactive` por papel + `status` no DTO [FR-006, FR-012] → `task-07.md`
- [ ] 8. `SearchGymUseCase` — `includeInactive` por papel + `status` no DTO [FR-006, FR-012] → `task-08.md`
- [ ] 9. `FetchGymByIdUseCase` — `includeInactive` por papel + `status` no DTO [FR-008, FR-009] → `task-09.md`
- [ ] 10. `CheckInUseCase` — bloqueia check-in em academia desativada [FR-007] → `task-10.md`
- [ ] 11. `DeactivateGymController` + rota + DI [FR-001, FR-005] → `task-11.md`
- [ ] 12. `ActivateGymController` + rota + DI [FR-002, FR-005] → `task-12.md`
- [ ] 13. `FetchAllGymsController` — `isProtected: true` + papel repassado [FR-006, FR-012] → `task-13.md`
- [ ] 14. `SearchGymController` — `isProtected: true` + papel repassado [FR-006, FR-012] → `task-14.md`
- [ ] 15. `FetchGymByIdController` — `isProtected: true` + papel repassado [FR-008, FR-009] → `task-15.md`
- [ ] 16. `GymStatusConfirmationDialog` (frontend) [FR-004] → `task-16.md`
- [ ] 17. `useDeactivateGym`/`useActivateGym` (frontend) [FR-001, FR-002] → `task-17.md`
- [ ] 18. Botão de alternância de status em `/academias/[id]` [FR-003, FR-004] → `task-18.md`
- [ ] 19. Selo "Desativada" em `GymCard`/`GymRow` para admin [FR-012] → `task-19.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 16
- **Wave 2** (sequential): 3
- **Wave 3** (sequential): 4
- **Wave 4** (parallel): 5, 6, 7, 8, 9, 10
- **Wave 5** (parallel): 11, 13, 14, 15
- **Wave 6** (sequential): 12
- **Wave 7** (sequential): 17
- **Wave 8** (sequential): 19
- **Wave 9** (sequential): 18
