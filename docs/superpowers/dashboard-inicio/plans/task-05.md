# Task 5: WeeklyChart + HeatmapCard [RF-015, RF-016, RF-017, RF-018, RF-019, RF-020, RF-021]

**Status:** PENDING
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Criar dois componentes de visualização sem dependência de biblioteca externa: `WeeklyChart` (barras CSS por dia da semana) e `HeatmapCard` (grid CSS estilo GitHub com 90 dias). Ambos recebem dados calculados pelas funções da Task 3.

## Arquivos

- Create: `apps/frontend/src/features/dashboard/components/weekly-chart.tsx`
- Create: `apps/frontend/src/features/dashboard/components/heatmap-card.tsx`

### Conformidade com as Skills Padrão

- react: componentes puros, props
- tailwindcss: grid, flex, cores de intensidade com opacity

## Passos

- [ ] **Step 1: Criar `WeeklyChart`**

```tsx
// apps/frontend/src/features/dashboard/components/weekly-chart.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

interface WeeklyChartProps {
	/**
	 * Array de 7 posições indexadas por dayOfWeek (0=Dom, 6=Sáb).
	 * Produzido por computeWeeklyFrequency() da Task 3.
	 */
	frequency: number[]
	isLoading?: boolean
}

export function WeeklyChart({ frequency, isLoading }: WeeklyChartProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-3 h-4 w-36" />
				<div className="flex items-end gap-2 pt-2" style={{ height: 80 }}>
					{Array.from({ length: 7 }).map((_, i) => (
						<Skeleton
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
							key={i}
							className="flex-1 rounded-sm"
							style={{ height: `${30 + Math.random() * 50}%` }}
						/>
					))}
				</div>
			</div>
		)
	}

	const max = Math.max(...frequency, 1)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Frequência semanal
			</p>
			<div
				role="img"
				aria-label="Gráfico de barras de frequência semanal"
				className="flex items-end gap-2"
				style={{ height: 80 }}
			>
				{frequency.map((count, dayIndex) => {
					const heightPct = (count / max) * 100
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: stable 7-item array
							key={dayIndex}
							className="flex flex-1 flex-col items-center gap-1"
						>
							<div
								className="w-full rounded-t-sm"
								style={{
									height: `${Math.max(heightPct, 4)}%`,
									background: count > 0
										? "hsl(var(--foreground))"
										: "hsl(var(--muted))",
								}}
								aria-label={`${DAY_LABELS[dayIndex]}: ${count} check-in${count !== 1 ? "s" : ""}`}
							/>
							<span className="text-xs text-muted-foreground">
								{DAY_LABELS[dayIndex]}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
```

- [ ] **Step 2: Criar `HeatmapCard`**

```tsx
// apps/frontend/src/features/dashboard/components/heatmap-card.tsx
import { Skeleton } from "@/components/ui/skeleton"
import type { HeatmapDay } from "@/features/dashboard/hooks/use-dashboard-metrics"
import { cn } from "@/lib/cn"

// Intensidade mapeada para opacidade do foreground
const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
	0: "bg-muted",
	1: "bg-foreground/20",
	2: "bg-foreground/40",
	3: "bg-foreground/70",
	4: "bg-foreground",
}

interface HeatmapCellProps {
	day: HeatmapDay
}

function HeatmapCell({ day }: HeatmapCellProps) {
	const label =
		day.count === 0
			? `${day.date}: sem check-in`
			: `${day.date}: ${day.count} check-in${day.count > 1 ? "s" : ""}`

	return (
		<div
			role="gridcell"
			aria-label={label}
			title={label}
			className={cn(
				"aspect-square w-full rounded-sm",
				INTENSITY_CLASS[day.intensity],
			)}
		/>
	)
}

interface HeatmapCardProps {
	days: HeatmapDay[]
	isLoading?: boolean
}

export function HeatmapCard({ days, isLoading }: HeatmapCardProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-3 h-4 w-48" />
				<div className="grid grid-cols-13 gap-1">
					{Array.from({ length: 91 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
						<Skeleton key={i} className="aspect-square w-full rounded-sm" />
					))}
				</div>
			</div>
		)
	}

	// Agrupar 90 dias em semanas (13 colunas × 7 linhas)
	// Padding inicial para alinhar ao dia da semana correto
	const firstDay = days[0]
	const firstDayOfWeek = firstDay ? new Date(firstDay.date).getDay() : 0
	const paddedDays: (HeatmapDay | null)[] = [
		...Array.from({ length: firstDayOfWeek }, () => null),
		...days,
	]

	// Agrupar em semanas
	const weeks: (HeatmapDay | null)[][] = []
	for (let i = 0; i < paddedDays.length; i += 7) {
		weeks.push(paddedDays.slice(i, i + 7))
	}

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Atividade — últimos 3 meses
			</p>
			<div
				role="grid"
				aria-label="Heatmap de atividade dos últimos 90 dias"
				className="flex gap-1"
			>
				{weeks.map((week, weekIdx) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: stable week index
						key={weekIdx}
						role="row"
						className="flex flex-col gap-1"
					>
						{week.map((day, dayIdx) =>
							day ? (
								<HeatmapCell key={day.date} day={day} />
							) : (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: padding cell
									key={`pad-${dayIdx}`}
									className="aspect-square w-3"
									aria-hidden="true"
								/>
							),
						)}
					</div>
				))}
			</div>
		</div>
	)
}
```

> **Nota:** `grid-cols-13` não existe no Tailwind padrão. Adicionar em `apps/frontend/src/app/globals.css` ou usar inline style. Preferir inline style: `style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)" }}` no container. Alternativamente, já está usando `flex` no código acima — verificar e ajustar se necessário durante implementação.

- [ ] **Step 3: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/dashboard/components/weekly-chart.tsx \
        apps/frontend/src/features/dashboard/components/heatmap-card.tsx
git commit -m "feat(frontend): add WeeklyChart and HeatmapCard dashboard components"
```

## Critérios de Sucesso

- `WeeklyChart` renderiza 7 barras com altura proporcional à frequência [RF-015, RF-016]
- Barras têm `aria-label` com dia e contagem para acessibilidade [RF-017]
- `HeatmapCard` renderiza 90 dias com 5 níveis de intensidade [RF-018, RF-019]
- Células do heatmap têm `aria-label` descritivo com data e contagem [RF-020]
- Dias sem dados têm aparência distinta (classe `bg-muted`) [RF-021]
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
