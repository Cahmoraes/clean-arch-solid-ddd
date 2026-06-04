# Tarefas: Admin Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Execution Waves` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/admin-analytics-design.md`
**PRD:** `../prd/prd-admin-analytics.md`

**Goal:** Adicionar página `/admin/analytics` com métricas de ocupação, retenção e crescimento para admins.

**Architecture:** Três endpoints granulares `GET /admin/analytics/{checkins,retention,growth}` implementados como use cases independentes em um novo bounded context `analytics`. Frontend consome os endpoints via TanStack Query e renderiza KPI row + três seções colapsáveis com gráficos Recharts/shadcn Chart.

**Tech Stack:** Fastify + Clean Architecture + Inversify + Prisma (backend), Next.js 16 + React 19 + TanStack Query + Recharts + shadcn/ui (frontend)

---

## Tarefas

- [ ] 1. Migração: indexes de performance no banco [FR-007, FR-009, FR-011, FR-015] → `task-01.md`
- [ ] 2. Backend IoC: analytics-types + export em types.ts [FR-001] → `task-02.md`
- [ ] 3. Backend Domain: AnalyticsPeriod + interfaces de repositório + in-memory test doubles [FR-002, FR-008] → `task-03.md`
- [ ] 4. Backend Use Case: FetchCheckInAnalyticsUseCase [FR-007, FR-008, FR-009] → `task-04.md`
- [ ] 5. Backend Use Case: FetchRetentionAnalyticsUseCase [FR-011, FR-012] → `task-05.md`
- [ ] 6. Backend Use Case: FetchGrowthAnalyticsUseCase [FR-014, FR-015] → `task-06.md`
- [ ] 7. Backend Infra: Prisma repositories (AnalyticsCheckIn + AnalyticsUser) → `task-07.md`
- [ ] 8. Backend Infra: Controllers + rotas analytics [FR-001] → `task-08.md`
- [ ] 9. Backend IoC: analytics-module + wiring + geração de types [FR-001] → `task-09.md`
- [ ] 10. Frontend Setup: instalar recharts + shadcn Chart + shadcn Collapsible → `task-10.md`
- [ ] 11. Frontend: useAnalyticsPeriod hook + PeriodSelector component [FR-002, FR-003] → `task-11.md`
- [ ] 12. Frontend API hooks: useCheckInMetrics + useRetentionMetrics + useGrowthMetrics [FR-004] → `task-12.md`
- [ ] 13. Frontend: AnalyticsKpiRow component [FR-004, FR-005, FR-006] → `task-13.md`
- [ ] 14. Frontend: CheckInMetricsSection component [FR-007, FR-008, FR-009, FR-010] → `task-14.md`
- [ ] 15. Frontend: RetentionMetricsSection component [FR-011, FR-012, FR-013] → `task-15.md`
- [ ] 16. Frontend: GrowthMetricsSection component [FR-014, FR-015, FR-016] → `task-16.md`
- [ ] 17. Frontend: AnalyticsPage assembly + navegação sidebar [FR-001, FR-002, FR-003] → `task-17.md`

## Execution Waves

- **Wave 1** (parallel): 1, 2, 10, 11
- **Wave 2** (sequential): 3
- **Wave 3** (parallel): 4, 5, 6, 7
- **Wave 4** (sequential): 8
- **Wave 5** (sequential): 9
- **Wave 6** (sequential): 12
- **Wave 7** (parallel): 13, 14, 15, 16
- **Wave 8** (sequential): 17
