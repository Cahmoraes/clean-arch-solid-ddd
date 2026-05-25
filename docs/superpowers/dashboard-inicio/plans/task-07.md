# Task 7: DashboardPage — composição, estados de erro/vazio e validação final [RF-029, RF-030, RF-031]

**Status:** DONE
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Compor o `DashboardPage` integrando todos os widgets criados nas Tasks 4–6. Conectar o hook `useDashboardHistory` e as funções de cálculo. Implementar estados de erro com retry e empty state para histórico vazio. Substituir o placeholder de `/inicio/page.tsx` pelo componente final. Ao final, rodar o pipeline de validação completo: lint + tsc + tests + build.

## Arquivos

- Create: `apps/frontend/src/features/dashboard/components/dashboard-page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/inicio/page.tsx`

### Conformidade com as Skills Padrão

- react: composição de componentes, error boundaries via estado de query
- tanstack-query-best-practices: `isError`, `refetch`, error recovery
- tailwindcss: grid responsivo, gap

## Passos

- [ ] **Step 1: Criar `DashboardPage`**

```tsx
// apps/frontend/src/features/dashboard/components/dashboard-page.tsx
"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMetrics } from "@/features/profile/api"
import { useDashboardHistory } from "@/features/dashboard/api"
import {
	computeHeatmap,
	computeStatusDistribution,
	computeStreak,
	computeThisMonth,
	computeWeeklyFrequency,
} from "@/features/dashboard/hooks/use-dashboard-metrics"
import { HeatmapCard } from "./heatmap-card"
import { CheckinsTimeline } from "./checkins-timeline"
import { KpiCards } from "./kpi-cards"
import { ProfileHeroCard } from "./profile-hero-card"
import { StatusDonutCard } from "./status-donut-card"
import { WeeklyChart } from "./weekly-chart"

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
			<AlertCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
			<p className="flex-1 text-sm text-muted-foreground">
				Não foi possível carregar o histórico de check-ins.
			</p>
			<Button variant="outline" size="sm" onClick={onRetry}>
				Tentar novamente
			</Button>
		</div>
	)
}

export function DashboardPage() {
	const {
		data: history = [],
		isLoading: isHistoryLoading,
		isError: isHistoryError,
		refetch,
	} = useDashboardHistory()

	const thisMonth = computeThisMonth(history)
	const streak = computeStreak(history)
	const weeklyFrequency = computeWeeklyFrequency(history)
	const heatmapDays = computeHeatmap(history)
	const statusDistribution = computeStatusDistribution(history)

	const now = new Date()
	const dateLabel = now.toLocaleDateString("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	})

	// Capitalize first letter
	const formattedDate =
		dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div>
				<h1 className="text-xl font-semibold">Dashboard</h1>
				<p className="text-sm text-muted-foreground">{formattedDate}</p>
			</div>

			{/* Profile Hero */}
			<ProfileHeroCard
				totalCheckIns={0}
				thisMonth={thisMonth}
				streak={streak}
			/>

			{/* Error banner (history only) */}
			{isHistoryError && <ErrorBanner onRetry={refetch} />}

			{/* KPI Cards */}
			<KpiCards
				thisMonth={thisMonth}
				streak={streak}
				isHistoryLoading={isHistoryLoading}
			/>

			{/* Charts row */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<WeeklyChart frequency={weeklyFrequency} isLoading={isHistoryLoading} />
				</div>
				<StatusDonutCard
					distribution={statusDistribution}
					isLoading={isHistoryLoading}
				/>
			</div>

			{/* Bottom row */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<HeatmapCard days={heatmapDays} isLoading={isHistoryLoading} />
				<CheckinsTimeline checkIns={history} isLoading={isHistoryLoading} />
			</div>
		</div>
	)
}
```

> **Nota sobre `totalCheckIns` no `ProfileHeroCard`:** o total vem de `useMetrics` (que já é chamado dentro de `KpiCards`). Para evitar chamada duplicada, o `ProfileHeroCard` chama `useMetrics()` internamente (TanStack Query deduplicará automaticamente — mesma query key). Nenhuma prop de total precisa ser passada — remover o prop `totalCheckIns` do `ProfileHeroCard` e ajustar a interface do componente para usar `useMetrics()` internamente. Editar `task-04.md` se necessário.
>
> Alternativa mais simples: manter `totalCheckIns={metrics?.checkInsCount ?? 0}` passado aqui após chamar `useMetrics` neste componente. Escolher a abordagem que mantiver menos props desnecessários.

- [ ] **Step 2: Corrigir a interface do ProfileHeroCard para usar useMetrics internamente**

Editar `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx` para remover a prop `totalCheckIns` e chamar `useMetrics()` diretamente dentro do componente:

```tsx
// Adicionar import:
import { useMe, useMetrics } from "@/features/profile/api"

// Remover prop totalCheckIns da interface:
interface ProfileHeroCardProps {
	thisMonth: number
	streak: number
}

// Adicionar dentro da função do componente:
const { data: metrics } = useMetrics()

// Usar metrics?.checkInsCount ?? 0 no lugar de totalCheckIns
```

Atualizar o uso em `DashboardPage`:

```tsx
// Antes:
<ProfileHeroCard totalCheckIns={0} thisMonth={thisMonth} streak={streak} />

// Depois:
<ProfileHeroCard thisMonth={thisMonth} streak={streak} />
```

- [ ] **Step 3: Atualizar a página `/inicio`**

```tsx
// apps/frontend/src/app/(authenticated)/inicio/page.tsx
import { DashboardPage } from "@/features/dashboard/components/dashboard-page"

export default function InicioDashboardPage() {
	return <DashboardPage />
}
```

- [ ] **Step 4: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros. Se houver erros de tipo, corrigi-los antes de prosseguir.

- [ ] **Step 5: Rodar todos os testes unitários**

```bash
cd apps/frontend && pnpm test -- --reporter=verbose
```

Esperado: todos os testes passam. Se algum falhar devido à mudança da sidebar, corrigir antes de prosseguir.

- [ ] **Step 6: Build de produção**

```bash
cd apps/frontend && pnpm build
```

Esperado: build completo sem erros. Se houver erros, corrigi-los — nunca pular esta etapa.

- [ ] **Step 7: Commit final**

```bash
git add apps/frontend/src/features/dashboard/ \
        apps/frontend/src/app/(authenticated)/inicio/page.tsx
git commit -m "feat(frontend): compose DashboardPage with all widgets and error states"
```

## Critérios de Sucesso

- `DashboardPage` renderiza todos os 6 widgets [RF-029]
- Cada widget tem skeleton independente durante loading — nenhum bloqueia a página toda [RF-029]
- `ErrorBanner` com botão retry aparece quando `useDashboardHistory` falha [RF-030]
- Com histórico vazio, KPIs mostram 0 e timeline mostra mensagem de empty state [RF-031]
- `pnpm lint:fix` passa com zero issues
- `pnpm tsc:check` passa sem erros de tipo
- `pnpm test` passa — todos os testes unitários existentes
- `pnpm build` completa sem erros
