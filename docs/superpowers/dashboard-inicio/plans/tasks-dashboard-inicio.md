# Tarefas: dashboard-inicio

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement tasks. Each task file contains full steps with checkbox (`- [ ]`) syntax for tracking.

**Spec:** `../specs/dashboard-inicio-design.md`
**PRD:** `../prd/prd-dashboard-inicio.md`

**Goal:** Adicionar rota `/inicio` como tela principal pós-login com dashboard de frequência, refatorando o `AuthenticatedShell` para sidebar lateral em todas as rotas autenticadas.

**Architecture:** O `AuthenticatedShell` é refatorado de top-nav para sidebar lateral CSS (sem nova dependência Radix). Os 6 widgets do dashboard são componentes independentes em `src/features/dashboard/` que consomem `useMe`, `useMetrics` (profile feature, reutilizados) e um novo hook `useDashboardHistory` que busca múltiplas páginas de check-ins em paralelo. Todos os cálculos (streak, heatmap, frequência semanal, distribuição de status) são funções puras em `use-dashboard-metrics.ts` testadas com Vitest sem rendering. Gráficos implementados com CSS flex + SVG puro (sem Recharts).

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, Vitest + Testing Library + MSW, Biome

---

## Tarefas

- [x] 1. Refatorar AuthenticatedShell → AppSidebar [RF-004, RF-005, RF-006, RF-007, RF-008] → `task-01.md`
- [x] 2. Criar rota `/inicio` e atualizar redirect pós-login [RF-001, RF-002, RF-003] → `task-02.md`
- [x] 3. Dashboard API hook + funções de cálculo de métricas [RF-014, RF-015, RF-016, RF-018, RF-019, RF-026, RF-027] → `task-03.md`
- [x] 4. ProfileHeroCard + KpiCards [RF-009, RF-010, RF-011, RF-012, RF-013] → `task-04.md`
- [x] 5. WeeklyChart + HeatmapCard [RF-015, RF-016, RF-017, RF-018, RF-019, RF-020, RF-021] → `task-05.md`
- [x] 6. CheckinsTimeline + StatusDonutCard [RF-022, RF-023, RF-024, RF-025, RF-026, RF-027, RF-028] → `task-06.md`
- [x] 7. DashboardPage — composição, estados de erro/vazio e validação final [RF-029, RF-030, RF-031] → `task-07.md`
