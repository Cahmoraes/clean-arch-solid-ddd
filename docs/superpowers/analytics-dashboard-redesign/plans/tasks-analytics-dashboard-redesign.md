# Tarefas: Analytics Dashboard Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use super.subagent-driven-development (recommended, sequential), super.parallel-subagent-in-tree (parallel waves in the shared tree, no worktrees), or super.parallel-subagent-development (parallel waves in isolated worktrees — see the `## Ondas de Execução` section below) to implement tasks. Progress is tracked at the task level via the checkbox (`- [ ]`) list below — each task file contains the full implementation steps for its task.

**Spec:** `../specs/analytics-dashboard-redesign-design.md`
**PRD:** `../prd/prd-analytics-dashboard-redesign.md`

**Goal:** Redesenhar `/admin/analytics` colocando membros em risco de churn visíveis imediatamente, KPI cards com sparklines embutidas e row de retenção sempre visível — zero interações necessárias para diagnóstico operacional.

**Architecture:** Três novos componentes isolados (`KpiCardWithSparkline`, `AtRiskAlertZone`, `RetentionMiniStats`) são criados e testados independentemente nas tasks 1–3. A task 4 consome esses três componentes: atualiza `AnalyticsKpiRow` para usar `KpiCardWithSparkline`, reorganiza `page.tsx` para incluir `AtRiskAlertZone` e `RetentionMiniStats` no novo layout, e deleta as três seções colapsáveis antigas. Sparklines são SVG inline via helper `buildSparklinePath` — sem dependência de Recharts para os KPI cards.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack Query (staleTime 60 s), shadcn/ui (Skeleton), Vitest + Testing Library, Lucide icons

---

## Tarefas

- [ ] 1. Criar componente KpiCardWithSparkline [FR-007, FR-008, FR-009] → `task-01.md`
- [ ] 2. Criar componente AtRiskAlertZone [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006] → `task-02.md`
- [ ] 3. Criar componente RetentionMiniStats [FR-010, FR-011] → `task-03.md`
- [ ] 4. Refatorar page.tsx e AnalyticsKpiRow — integração e remoção das seções colapsáveis [FR-012, FR-013, FR-014] → `task-04.md`

## Ondas de Execução

- **Wave 1** (parallel): 1, 2, 3
- **Wave 2** (sequential): 4
