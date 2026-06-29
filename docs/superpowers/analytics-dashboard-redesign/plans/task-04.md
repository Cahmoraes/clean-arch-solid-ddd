# Task 4: Refatorar page.tsx e AnalyticsKpiRow — integração e remoção das seções colapsáveis [FR-012, FR-013, FR-014]

**Status:** PENDING
**PRD:** `../prd/prd-analytics-dashboard-redesign.md`
**Spec:** `../specs/analytics-dashboard-redesign-design.md`
**Tier:** capable
**Depends on:** task-01, task-02, task-03

## Visão Geral

Esta task conclui o redesign integrando os três novos componentes no layout da página e removendo as seções colapsáveis antigas. São três ações:

1. **Atualizar `analytics-kpi-row.tsx`**: substituir os três `StatCard` por `KpiCardWithSparkline`, passando sparklineData derivado das hooks existentes. Remover o `biome-ignore` (a nova implementação fica dentro da complexidade máxima).
2. **Reescrever `page.tsx`**: adicionar `AtRiskAlertZone` e `RetentionMiniStats`, remover imports/uso de `CheckInMetricsSection`, `RetentionMetricsSection` e `GrowthMetricsSection`. `AnalyticsContent` chama `useRetentionMetrics` para alimentar ambos (TanStack Query deduplica a chamada com a que já ocorre em `AnalyticsKpiRow`).
3. **Deletar os 3 arquivos de seções colapsáveis** (o `useGrowthMetrics` e `useCheckInMetrics` ficam apenas em `analytics-kpi-row.tsx`; `useRetentionMetrics` continua em ambos via cache).

Campos de dados usados (confirmados nas tasks anteriores):
- `useCheckInMetrics(period)` → `{ totalCheckIns, dailySeries: {date, count}[] }`
- `useRetentionMetrics(period)` → `{ activeCount, inactiveCount, churnRate, atRiskMembers: {id, name, daysSinceLastCheckIn}[] }`
- `useGrowthMetrics(period)` → `{ newMembersCount, activeMembersTrend: {date, count}[], newMembersPerPeriod: {date, count}[] }`
- Taxa de retenção: `(100 - churnRate).toFixed(1)%` (não há campo `retentionRate` na API; `AnalyticsKpiRow` atual usa essa fórmula)

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/analytics/page.tsx`
- Modify: `apps/frontend/src/features/admin/analytics/components/analytics-kpi-row.tsx`
- Delete: `apps/frontend/src/features/admin/analytics/components/check-in-metrics-section.tsx`
- Delete: `apps/frontend/src/features/admin/analytics/components/retention-metrics-section.tsx`
- Delete: `apps/frontend/src/features/admin/analytics/components/growth-metrics-section.tsx`
- Create: `apps/frontend/src/features/admin/analytics/components/__tests__/analytics-page-integration.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: layout final da página em `space-y-6`; hierarquia periodo → at-risk → kpi → retention row
- `react`: `useRetentionMetrics` chamado em `AnalyticsContent` para passar dados para `AtRiskAlertZone` e `RetentionMiniStats`; TanStack Query deduplica chamadas com mesma query key
- `tanstack-query-best-practices`: `isPending` (não `isLoading`) para estado de carregamento; `data?.field ?? fallback` para optional chaining seguro
- `refactoring`: extração de lógica de derivação de sparklineData para dentro do `AnalyticsKpiRow`; remoção do `biome-ignore` após simplificação; deleção dos 3 arquivos de seções antigas
- `no-workarounds`: deletar arquivos não mais referenciados (não comentar nem deixar dead code)

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/analytics-dashboard-redesign-visual.md` (ordem vertical: `PeriodSelector` → `AtRiskAlertZone` → `AnalyticsKpiRow` → `RetentionMiniStats`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Ferramentas de fidelidade visual:** nenhuma configurada
- **Decisões visuais já tomadas:** layout em `space-y-6`; seletor de período alinhado à direita (mantido do layout original); nenhum gráfico grande; nenhuma seção colapsável

## Passos

- **Step 1: Escrever o teste de integração com falha**

```tsx
// apps/frontend/src/features/admin/analytics/components/__tests__/analytics-page-integration.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

// Mock dos hooks de analytics para isolar o componente de rede
vi.mock("@/features/admin/analytics/api/use-check-in-metrics", () => ({
	useCheckInMetrics: () => ({
		data: { totalCheckIns: 1284, dailySeries: [{ date: "2026-06-01", count: 40 }, { date: "2026-06-02", count: 45 }] },
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/api/use-retention-metrics", () => ({
	useRetentionMetrics: () => ({
		data: {
			activeCount: 312,
			inactiveCount: 44,
			churnRate: 4.2,
			atRiskMembers: [
				{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 },
			],
		},
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/api/use-growth-metrics", () => ({
	useGrowthMetrics: () => ({
		data: {
			newMembersCount: 28,
			activeMembersTrend: [{ date: "2026-06-01", count: 310 }, { date: "2026-06-02", count: 312 }],
			newMembersPerPeriod: [{ date: "2026-06-01", count: 14 }, { date: "2026-06-02", count: 14 }],
		},
		isPending: false,
		isError: false,
	}),
}))

vi.mock("@/features/admin/analytics/hooks/use-analytics-period", () => ({
	useAnalyticsPeriod: () => ({ period: "30d", setPeriod: vi.fn() }),
}))

// eslint-disable-next-line import/first
import AnalyticsPage from "@/app/(authenticated)/admin/analytics/page"

describe("AnalyticsPage (integração)", () => {
	test("não renderiza CheckInMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		// O texto que era título da seção colapsável de check-ins
		expect(screen.queryByText("Métricas de Check-in")).not.toBeInTheDocument()
	})

	test("não renderiza RetentionMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		expect(screen.queryByText("Métricas de Retenção")).not.toBeInTheDocument()
	})

	test("não renderiza GrowthMetricsSection após o redesign", () => {
		render(<AnalyticsPage />)
		expect(screen.queryByText("Crescimento")).not.toBeInTheDocument()
	})

	test("renderiza AtRiskAlertZone com dados de membros em risco", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText(/membros em risco de churn/i)).toBeInTheDocument()
	})

	test("renderiza KPI cards com sparklines", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
		expect(screen.getByText("Taxa de retenção")).toBeInTheDocument()
		expect(screen.getByText("Novos membros")).toBeInTheDocument()
	})

	test("renderiza RetentionMiniStats com contagens de membros", () => {
		render(<AnalyticsPage />)
		expect(screen.getByText("Membros ativos")).toBeInTheDocument()
		expect(screen.getByText("Inativos")).toBeInTheDocument()
		expect(screen.getByText("Taxa de churn")).toBeInTheDocument()
	})
})
```

- **Step 2: Executar testes para confirmar falha**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/analytics-page-integration.test.tsx --run
```

Esperado: FAIL — testes de "não renderiza" passam (seções ainda existem, mas o page.tsx antigo as inclui), testes de "renderiza AtRiskAlertZone/RetentionMiniStats" falham

- **Step 3: Atualizar `analytics-kpi-row.tsx`**

Substituir o conteúdo completo do arquivo:

```tsx
// apps/frontend/src/features/admin/analytics/components/analytics-kpi-row.tsx
"use client"

import { useCheckInMetrics } from "../api/use-check-in-metrics"
import { useGrowthMetrics } from "../api/use-growth-metrics"
import { useRetentionMetrics } from "../api/use-retention-metrics"
import type { PeriodKey } from "../hooks/use-analytics-period"
import { KpiCardWithSparkline } from "./kpi-card-with-sparkline"

interface AnalyticsKpiRowProps {
	period: PeriodKey
}

export function AnalyticsKpiRow({ period }: AnalyticsKpiRowProps) {
	const checkInQuery = useCheckInMetrics(period)
	const retentionQuery = useRetentionMetrics(period)
	const growthQuery = useGrowthMetrics(period)

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<KpiCardWithSparkline
				value={checkInQuery.data?.totalCheckIns.toLocaleString("pt-BR") ?? "—"}
				label="Check-ins no período"
				sparklineData={checkInQuery.data?.dailySeries.map((d) => d.count) ?? []}
				isLoading={checkInQuery.isPending}
				isError={checkInQuery.isError}
			/>
			<KpiCardWithSparkline
				value={
					retentionQuery.data
						? `${(100 - retentionQuery.data.churnRate).toFixed(1)}%`
						: "—"
				}
				label="Taxa de retenção"
				sparklineData={growthQuery.data?.activeMembersTrend.map((d) => d.count) ?? []}
				highlight
				isLoading={retentionQuery.isPending || growthQuery.isPending}
				isError={retentionQuery.isError}
			/>
			<KpiCardWithSparkline
				value={growthQuery.data?.newMembersCount.toLocaleString("pt-BR") ?? "—"}
				label="Novos membros"
				sparklineData={growthQuery.data?.newMembersPerPeriod.map((d) => d.count) ?? []}
				isLoading={growthQuery.isPending}
				isError={growthQuery.isError}
			/>
		</div>
	)
}
```

- **Step 4: Reescrever `page.tsx`**

Substituir o conteúdo completo do arquivo:

```tsx
// apps/frontend/src/app/(authenticated)/admin/analytics/page.tsx
"use client"

import { Suspense } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/ui/page-header"
import { useRetentionMetrics } from "@/features/admin/analytics/api/use-retention-metrics"
import { AnalyticsKpiRow } from "@/features/admin/analytics/components/analytics-kpi-row"
import { AtRiskAlertZone } from "@/features/admin/analytics/components/at-risk-alert-zone"
import { PeriodSelector } from "@/features/admin/analytics/components/period-selector"
import { RetentionMiniStats } from "@/features/admin/analytics/components/retention-mini-stats"
import { useAnalyticsPeriod } from "@/features/admin/analytics/hooks/use-analytics-period"

function AnalyticsContent() {
	const { period, setPeriod } = useAnalyticsPeriod()
	const retentionQuery = useRetentionMetrics(period)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div />
				<PeriodSelector value={period} onValueChange={setPeriod} />
			</div>

			<AtRiskAlertZone
				members={retentionQuery.data?.atRiskMembers ?? []}
				isLoading={retentionQuery.isPending}
			/>

			<AnalyticsKpiRow period={period} />

			<RetentionMiniStats
				activeCount={retentionQuery.data?.activeCount ?? 0}
				inactiveCount={retentionQuery.data?.inactiveCount ?? 0}
				churnRate={retentionQuery.data?.churnRate ?? 0}
				isLoading={retentionQuery.isPending}
			/>
		</div>
	)
}

export default function AnalyticsPage() {
	return (
		<PageContainer>
			<PageHeader title="Analytics" />
			<Suspense fallback={null}>
				<AnalyticsContent />
			</Suspense>
		</PageContainer>
	)
}
```

- **Step 5: Deletar os 3 arquivos de seções colapsáveis antigas**

```bash
rm apps/frontend/src/features/admin/analytics/components/check-in-metrics-section.tsx
rm apps/frontend/src/features/admin/analytics/components/retention-metrics-section.tsx
rm apps/frontend/src/features/admin/analytics/components/growth-metrics-section.tsx
```

- **Step 6: Executar testes de integração para confirmar que passam**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/analytics-page-integration.test.tsx --run
```

Esperado: PASS — todos os 6 testes passando

- **Step 7: Rodar suite completa de testes de analytics**

```bash
pnpm --filter frontend test -- src/features/admin/analytics --run
```

Esperado: PASS — todos os testes do módulo passando (tasks 1, 2, 3 + nova task 4)

- **Step 8: Rodar lint, typecheck e build**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend build
```

Esperado: zero erros em todos. O build confirma que não há imports dangling dos 3 arquivos deletados.

- **Step 9: Commit**

```bash
git add \
  apps/frontend/src/app/\(authenticated\)/admin/analytics/page.tsx \
  apps/frontend/src/features/admin/analytics/components/analytics-kpi-row.tsx \
  apps/frontend/src/features/admin/analytics/components/__tests__/analytics-page-integration.test.tsx
git rm \
  apps/frontend/src/features/admin/analytics/components/check-in-metrics-section.tsx \
  apps/frontend/src/features/admin/analytics/components/retention-metrics-section.tsx \
  apps/frontend/src/features/admin/analytics/components/growth-metrics-section.tsx
git commit -m "feat(analytics): redesign completo — at-risk zone, sparklines e remoção das seções colapsáveis"
```

## Critérios de Sucesso

- `CheckInMetricsSection`, `RetentionMetricsSection`, `GrowthMetricsSection` não presentes no DOM — FR-012, FR-013
- Nenhum arquivo de seção colapsável presente no repositório após o commit — FR-012, FR-013
- `AtRiskAlertZone` e `RetentionMiniStats` visíveis no layout da página, abaixo do period selector e dos KPI cards respectivamente
- `AnalyticsKpiRow` atualizado para usar `KpiCardWithSparkline` (sparklines respondem ao `period` ativo)
- Card de retenção com `highlight` ativo no grid de KPI
- `pnpm lint:fix`, `pnpm tsc:check` e `pnpm build` sem erros — FR-014
