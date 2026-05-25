# Task 6: CheckinsTimeline + StatusDonutCard [RF-022, RF-023, RF-024, RF-025, RF-026, RF-027, RF-028]

**Status:** PENDING
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Criar dois componentes: `CheckinsTimeline` (lista dos 5 check-ins mais recentes com badges de status coloridos e link "Ver todos") e `StatusDonutCard` (gráfico rosca SVG com proporção por status). Ambos recebem dados já calculados como props.

## Arquivos

- Create: `apps/frontend/src/features/dashboard/components/checkins-timeline.tsx`
- Create: `apps/frontend/src/features/dashboard/components/status-donut-card.tsx`

### Conformidade com as Skills Padrão

- react: componentes puros com props
- tailwindcss: cores semânticas, flex, gap
- shadcn: EmptyState (componente existente em `src/components/ui/empty-state.tsx`)

## Passos

- [ ] **Step 1: Verificar a interface do EmptyState existente**

```bash
cat apps/frontend/src/components/ui/empty-state.tsx
```

Usar a interface do componente real para a prop de empty state na timeline.

- [ ] **Step 2: Criar `CheckinsTimeline`**

```tsx
// apps/frontend/src/features/dashboard/components/checkins-timeline.tsx
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import type { CheckIn } from "@/features/check-ins/api"
import { cn } from "@/lib/cn"

type CheckInStatus = "validated" | "pending" | "rejected"

const STATUS_LABEL: Record<CheckInStatus, string> = {
	validated: "Validado",
	pending: "Pendente",
	rejected: "Rejeitado",
}

const STATUS_DOT_CLASS: Record<CheckInStatus, string> = {
	validated: "bg-green-400",
	pending: "bg-yellow-400",
	rejected: "bg-red-400",
}

const STATUS_BADGE_CLASS: Record<CheckInStatus, string> = {
	validated: "border-green-800/30 bg-green-900/20 text-green-400",
	pending: "border-yellow-800/30 bg-yellow-900/20 text-yellow-400",
	rejected: "border-red-800/30 bg-red-900/20 text-red-400",
}

function formatRelativeDate(iso: string): string {
	const date = new Date(iso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / 86_400_000)

	if (diffDays === 0) {
		return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
	}
	if (diffDays === 1) {
		return `Ontem, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
	}
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface CheckinsTimelineProps {
	checkIns: CheckIn[]
	isLoading?: boolean
}

export function CheckinsTimeline({ checkIns, isLoading }: CheckinsTimelineProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-4 h-4 w-36" />
				{Array.from({ length: 4 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
					<div key={i} className="mb-3 flex items-start gap-3">
						<Skeleton className="mt-1 h-2 w-2 rounded-full" />
						<div className="flex-1">
							<Skeleton className="mb-1 h-4 w-40" />
							<Skeleton className="h-3 w-24" />
						</div>
						<Skeleton className="h-5 w-16 rounded-full" />
					</div>
				))}
			</div>
		)
	}

	const recent = checkIns.slice(0, 5)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Últimos check-ins
			</p>

			{recent.length === 0 ? (
				<p className="py-4 text-center text-sm text-muted-foreground">
					Nenhum check-in registrado ainda.
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{recent.map((ci) => (
						<li key={ci.id} className="flex items-start gap-3">
							<span
								className={cn(
									"mt-1.5 h-2 w-2 flex-shrink-0 rounded-full",
									STATUS_DOT_CLASS[ci.status],
								)}
								aria-hidden="true"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">
									{ci.gymTitle ?? "Academia"}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatRelativeDate(ci.createdAt)}
								</p>
							</div>
							<span
								className={cn(
									"flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
									STATUS_BADGE_CLASS[ci.status],
								)}
							>
								{STATUS_LABEL[ci.status]}
							</span>
						</li>
					))}
				</ul>
			)}

			<div className="mt-4 border-t border-border pt-3 text-right">
				<Link
					href="/check-ins"
					className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
				>
					Ver todos
				</Link>
			</div>
		</div>
	)
}
```

- [ ] **Step 3: Criar `StatusDonutCard`**

```tsx
// apps/frontend/src/features/dashboard/components/status-donut-card.tsx
import { Skeleton } from "@/components/ui/skeleton"
import type { StatusDistribution } from "@/features/dashboard/hooks/use-dashboard-metrics"

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ≈ 175.93

interface DonutSegment {
	label: string
	count: number
	color: string
	length: number
	offset: number
}

function buildSegments(dist: StatusDistribution): DonutSegment[] {
	const total = dist.validated + dist.pending + dist.rejected
	if (total === 0) return []

	const validatedLen = (dist.validated / total) * CIRCUMFERENCE
	const pendingLen = (dist.pending / total) * CIRCUMFERENCE
	const rejectedLen = (dist.rejected / total) * CIRCUMFERENCE

	// Offset inicial: rotacionar -90° = deslocar CIRCUMFERENCE/4 = ~43.98
	const startOffset = CIRCUMFERENCE / 4

	return [
		{
			label: "Validado",
			count: dist.validated,
			color: "#4ade80",
			length: validatedLen,
			offset: startOffset,
		},
		{
			label: "Pendente",
			count: dist.pending,
			color: "#facc15",
			length: pendingLen,
			offset: startOffset - validatedLen,
		},
		{
			label: "Rejeitado",
			count: dist.rejected,
			color: "#f87171",
			length: rejectedLen,
			offset: startOffset - validatedLen - pendingLen,
		},
	]
}

interface StatusDonutCardProps {
	distribution: StatusDistribution
	isLoading?: boolean
}

export function StatusDonutCard({ distribution, isLoading }: StatusDonutCardProps) {
	if (isLoading) {
		return (
			<div className="rounded-xl border border-border bg-card p-4">
				<Skeleton className="mb-4 h-4 w-40" />
				<div className="flex items-center justify-center gap-6">
					<Skeleton className="h-20 w-20 rounded-full" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-26" />
					</div>
				</div>
			</div>
		)
	}

	const total = distribution.validated + distribution.pending + distribution.rejected
	const segments = buildSegments(distribution)

	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Status dos check-ins
			</p>
			<div className="flex items-center justify-center gap-6">
				<svg
					width="80"
					height="80"
					viewBox="0 0 80 80"
					aria-label={`Distribuição de status: ${distribution.validated} validados, ${distribution.pending} pendentes, ${distribution.rejected} rejeitados`}
					role="img"
				>
					{/* Track */}
					<circle
						cx="40"
						cy="40"
						r={RADIUS}
						fill="none"
						stroke="hsl(var(--muted))"
						strokeWidth="14"
					/>
					{total === 0 ? null : segments.map((seg) => (
						<circle
							key={seg.label}
							cx="40"
							cy="40"
							r={RADIUS}
							fill="none"
							stroke={seg.color}
							strokeWidth="14"
							strokeDasharray={`${seg.length} ${CIRCUMFERENCE}`}
							strokeDashoffset={seg.offset}
						/>
					))}
				</svg>

				<ul className="flex flex-col gap-2">
					{[
						{ label: "Validado", count: distribution.validated, color: "#4ade80" },
						{ label: "Pendente", count: distribution.pending, color: "#facc15" },
						{ label: "Rejeitado", count: distribution.rejected, color: "#f87171" },
					].map(({ label, count, color }) => (
						<li key={label} className="flex items-center gap-2 text-sm">
							<span
								className="h-2 w-2 flex-shrink-0 rounded-full"
								style={{ background: color }}
								aria-hidden="true"
							/>
							<span className="text-muted-foreground">{label}</span>
							<span className="ml-auto font-medium">{count}</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
```

- [ ] **Step 4: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/dashboard/components/checkins-timeline.tsx \
        apps/frontend/src/features/dashboard/components/status-donut-card.tsx
git commit -m "feat(frontend): add CheckinsTimeline and StatusDonutCard dashboard components"
```

## Critérios de Sucesso

- `CheckinsTimeline` exibe até 5 check-ins com gym title, data relativa e badge de status [RF-022]
- Badges têm cor semântica: verde/amarelo/vermelho [RF-023]
- Link "Ver todos" aponta para `/check-ins` [RF-024]
- Empty state exibido quando sem check-ins [RF-025]
- `StatusDonutCard` renderiza SVG rosca com 3 segmentos [RF-026, RF-028]
- Legenda com label e contagem para cada status [RF-027]
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
