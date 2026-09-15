# Tarefas: Horário de Funcionamento da Academia

**Spec:** `../specs/spec-gym-dates-design.md`
**PRD:** `../prd/prd-spec-gym-dates.md`

**Goal:** Adicionar horário de funcionamento opcional ao Gym (VO + Json, múltiplos intervalos/dia) com cadastro/edição e resumo na tela de detalhe (layout C compacto + badge Aberto agora + tabela expansível).

**Architecture:** VO `OperatingHours/DaySchedule/TimeInterval` com validação via `Either`, coluna `operating_hours Json?` em `Gym` (single migration, sem tabela), `PrismaGymRepository` mapper, use cases `create/update/fetch` estendidos, Zod schemas compartilhados, componentes `OperatingHoursField` e `OperatingHoursSummary` + hook `useIsGymOpen` (America/Sao_Paulo), DetailCard integrado. Decisão JSON YAGNI, DDD com `create/restore`.

**Tech Stack:** node · Next.js 15 + Tailwind 4.3 + shadcn/ui · backend Vitest (`pnpm --filter backend test:run` + `test:business-flow`) · frontend Vitest happy-dom (`pnpm --filter frontend test -- --run`) + MSW

---

## Tarefas

- [ ] 1. VO de domínio OperatingHours (TimeInterval/DaySchedule) com validação e isOpenAt [FR-003, FR-004, FR-005] → `task-01.md`
- [ ] 2. Prisma migration + entidade Gym + PrismaGymRepository + factory [FR-001, FR-006] → `task-02.md`
- [ ] 3. Backend API: use cases create/update/fetch + controllers Zod + OpenAPI [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006] → `task-03.md`
- [ ] 4. Frontend base: tipos @repo/api-types + Zod + OperatingHoursField [FR-010, FR-003, FR-004, FR-005] → `task-04.md`
- [ ] 5. Frontend detalhe: OperatingHoursSummary + useIsGymOpen + integração DetailCard [FR-006, FR-007, FR-008, FR-009] → `task-05.md`
- [ ] 6. Frontend admin: integração OperatingHoursField nas páginas nova/editar + client create/update [FR-001, FR-002, FR-010] → `task-06.md`
- [ ] 7. Testes de cobertura e polish: unit/integration/component + regeneração tipos + ajustes finais [FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010] → `task-07.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (parallel): 2, 4
- **Wave 3** (parallel): 3, 5
- **Wave 4** (sequential): 6
- **Wave 5** (sequential): 7
