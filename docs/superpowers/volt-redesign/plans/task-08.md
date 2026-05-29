# Task 8: Redesign do Dashboard (stat-grid, week-chart, rank-list, atividade) [RF-016, RF-024]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Restila o Dashboard (`/inicio`) no vocabulário VOLT: `PageHeader`, grade de 4 KPIs com `StatCard`, gráfico semanal em barras (accent no dia atual), ranking de academias e lista de atividade recente. Preserva os hooks de dados existentes (`useDashboardHistory` + métricas computadas) e o `StatusDonutCard` (exceção semântica — não alterar a lógica do donut, apenas tokens de cor herdados). Grades fazem reflow conforme largura.

## Arquivos

- Modify: `apps/frontend/src/features/dashboard/components/dashboard-page.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`
- Modify: `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`
- Test: `apps/frontend/src/features/dashboard/components/dashboard-page.test.tsx` (novo ou estendido)

### Conformidade com as Skills Padrão

- use code-style: reusar `StatCard`/`PageHeader`, tokens semânticos, não alterar contratos de dados
- use test-antipatterns: mockar a query de dados (dependência), asserir UI renderizada

## Passos

- [ ] **Step 1: Escrever o teste que falha (cabeçalho + KPIs VOLT)**

Crie/estenda `apps/frontend/src/features/dashboard/components/dashboard-page.test.tsx`:

```tsx
import { describe, expect, test, vi } from "vitest"
import { render, screen } from "@/test/render"

vi.mock("@/features/dashboard/api", () => ({
	useDashboardHistory: () => ({ data: [], isLoading: false, isError: false }),
}))

import { DashboardPage } from "./dashboard-page"

describe("DashboardPage VOLT", () => {
	test("exibe o cabeçalho Dashboard", () => {
		render(<DashboardPage />)
		expect(screen.getByRole("heading", { name: /Dashboard/i })).toBeInTheDocument()
	})

	test("renderiza a grade de KPIs", () => {
		render(<DashboardPage />)
		expect(screen.getByTestId("dashboard-stat-grid")).toBeInTheDocument()
	})
})
```

> Ajuste o `vi.mock` à assinatura real de `useDashboardHistory` ao abrir o arquivo; o objetivo é renderizar sem rede.

- [ ] **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "DashboardPage VOLT"`
Expected: FAIL — falta o `PageHeader`/`data-testid="dashboard-stat-grid"`.

- [ ] **Step 3: Aplicar `PageHeader` e a grade de KPIs no `dashboard-page.tsx`**

Substitua o título manual pelo `PageHeader` e envolva os KPIs numa grade responsiva com `data-testid`:

```tsx
import { PageHeader } from "@/components/ui/page-header"
// ...
<PageHeader
	eyebrow="Visão geral"
	title="Dashboard"
	subtitle={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date())}
/>
<div
	data-testid="dashboard-stat-grid"
	className="mb-[18px] grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[560px]:grid-cols-1"
>
	{/* KpiCards renderiza StatCard aqui */}
</div>
<div className="grid grid-cols-[1.6fr_1fr] gap-[18px] max-[1100px]:grid-cols-1">
	{/* WeeklyChart + ranking/StatusDonutCard */}
</div>
```

- [ ] **Step 4: Reescrever `kpi-cards.tsx` usando `StatCard`**

Cada KPI passa a usar o `StatCard` da Task 4 (ícone, valor mono, label, delta opcional). Exemplo de um card (repita para os 4: Membros ativos, Check-ins hoje, Academias, Pendentes):

```tsx
import { Building2, CheckCircle, Clock, Users } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
// ...
<StatCard icon={Users} value={String(activeMembers)} label="Membros ativos" highlight delta={{ value: "+4%", direction: "up" }} />
<StatCard icon={CheckCircle} value={String(checkinsToday)} label="Check-ins hoje" />
<StatCard icon={Building2} value={String(gymsCount)} label="Academias" />
<StatCard icon={Clock} value={String(pending)} label="Pendentes" />
```

Mantenha as variáveis derivadas das métricas já computadas pelos hooks existentes.

- [ ] **Step 5: Restilar o gráfico semanal em `weekly-chart.tsx`**

Aplique o estilo de barras VOLT (trilho `bg-surface-3`, barra accent no dia atual), preservando os dados/SVG existentes. Classe das barras:

```tsx
// container
<div className="flex h-[200px] items-end gap-2.5">
// cada coluna
<div className="flex h-full flex-1 flex-col items-center gap-2.5">
	<div className="flex w-full flex-1 items-end">
		<div
			className="w-full origin-bottom rounded-t-lg bg-surface-3 [animation:voltBar_0.7s_cubic-bezier(0.2,0.8,0.2,1)] data-[current=true]:bg-accent"
			data-current={isCurrentDay}
			style={{ height: `${pct}%` }}
		/>
	</div>
	<span className="text-xs font-medium text-subtle">{dayLabel}</span>
</div>
```

> A keyframe `voltBar` é adicionada globalmente na Task 14. Até lá a barra renderiza no estado final (altura por `style`), sem depender da animação.

- [ ] **Step 6: Restilar ranking e atividade recente**

Linhas de ranking/atividade com divisórias `border-border`:

```tsx
<div className="flex items-center gap-3.5 border-b border-border py-3 last:border-b-0">
	<span className="w-[22px] text-[13px] text-subtle">{index + 1}</span>
	<div className="flex-1">
		<p className="text-[14.5px] font-semibold">{name}</p>
		<p className="text-[12.5px] text-subtle">{sub}</p>
	</div>
	<span className="text-[15px] font-semibold text-muted-foreground tabular font-mono">{value}</span>
</div>
```

Aplique o mesmo padrão em `checkins-timeline.tsx` (atividade), com `activity-time` em `text-xs text-subtle`.

- [ ] **Step 7: Rodar o teste, suíte, lint, tsc e build**

Run: `pnpm --filter frontend test -- -t "DashboardPage VOLT"`
Expected: PASS.

Run: `pnpm --filter frontend test && pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/features/dashboard/components/
git commit -m "feat(volt-redesign): dashboard com StatCard, week-chart e listas VOLT"
```

## Critérios de Sucesso

- KPIs renderizados com `StatCard` (valor mono, delta) e grade responsiva [RF-016, RF-024]
- Gráfico semanal com barra accent no dia atual
- Ranking e atividade com divisórias e tipografia VOLT
- `StatusDonutCard` preservado (sem mudança de lógica)
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
