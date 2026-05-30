# Tarefas: checkin-badges-search-sort

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/checkin-badges-search-sort-design.md`
**PRD:** `../prd/prd-checkin-badges-search-sort.md`

**Goal:** Adicionar badges de contagem por status, busca por nome de academia e ordenação (mais recentes/mais antigos) nas telas `/check-ins` e `/admin/check-ins`.

**Architecture:** Backend expõe dois novos endpoints de stats (`GET /check-ins/stats` e `GET /check-ins/me/stats`) e estende os endpoints de listagem com os parâmetros `gymName` (filtro ILIKE via Prisma nested where) e `sortOrder` (asc/desc). Frontend usa hooks TanStack Query para os stats, estende `useCheckInFilters` com os novos parâmetros de URL, adiciona dois novos componentes (`CheckInSearchInput`, `CheckInSortToggle`) e integra tudo nas páginas de check-in de usuário e admin.

**Tech Stack:** TypeScript, Fastify, Inversify (IoC), Prisma ORM, Zod, Vitest, supertest (backend) · Next.js 15, React 19, TanStack Query v5, MSW v2, Vitest, Testing Library (frontend)

---

## Tarefas

- [ ] 1. Backend — Estender listagem com gymName e sortOrder [RF-006, RF-007, RF-008, RF-009, RF-012, RF-013, RF-014, RF-015, RF-016] → `task-01.md`
- [ ] 2. Backend — Stats de check-ins (countByStatus + use case + controllers + IoC) [RF-001, RF-002, RF-003, RF-004, RF-005] → `task-02.md`
- [ ] 3. Frontend — Contrato de API e hooks de dados (extended-paths + useCheckIns + useStats) [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-011, RF-012, RF-015, RF-017] → `task-03.md`
- [ ] 4. Frontend — Estender useCheckInFilters com gymName e sortOrder [RF-006, RF-011, RF-012, RF-015, RF-017] → `task-04.md`
- [ ] 5. Frontend — Atualizar CheckInFilterBar com badges de contagem [RF-001, RF-002, RF-003, RF-004] → `task-05.md`
- [ ] 6. Frontend — Criar CheckInSearchInput e CheckInSortToggle [RF-006, RF-008, RF-010, RF-012, RF-013] → `task-06.md`
- [ ] 7. Frontend — Integrar tudo nas páginas de check-in [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008, RF-009, RF-010, RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-017, RF-018, RF-019] → `task-07.md`

---

## Execution Waves

```
Wave 1 (parallel): task-01, task-02, task-04, task-06
Wave 2 (sequential): task-03  ← depends on task-01, task-02
Wave 3 (sequential): task-05  ← depends on task-03
Wave 4 (sequential): task-07  ← depends on task-03, task-04, task-05, task-06
```

**Wave 1** — 4 tarefas independentes podem rodar em paralelo:
- `task-01` estende repositório e use case de listagem (backend)
- `task-02` adiciona stats de check-in do zero (backend, arquivos diferentes de task-01)
- `task-04` estende `useCheckInFilters` (hook puro de URL state, sem dependência de API)
- `task-06` cria componentes UI puros (sem dependência de hooks de dados)

**Wave 2** — `task-03` depende de task-01 (backend list params) e task-02 (backend stats) para o contrato de API frontend estar correto; também atualiza `useMyCheckIns`/`useCheckIns` e cria hooks de stats.

**Wave 3** — `task-05` atualiza `CheckInFilterBar` para aceitar `stats?: CheckInStats`; precisa do tipo `CheckInStats` exportado por task-03.

**Wave 4** — `task-07` integra tudo nas páginas; precisa de task-03 (hooks), task-04 (filtros URL), task-05 (FilterBar com badges), task-06 (novos componentes).
