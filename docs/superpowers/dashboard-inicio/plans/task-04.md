# Task 4: ProfileHeroCard + KpiCards [RF-009, RF-010, RF-011, RF-012, RF-013]

**Status:** PENDING
**PRD:** `../prd/prd-dashboard-inicio.md`
**Spec:** `../specs/dashboard-inicio-design.md`

## Visão Geral

Criar dois componentes: `ProfileHeroCard` (card de boas-vindas com avatar de iniciais, dados do perfil e stats inline) e `KpiCards` (grid de 4 cards com total de check-ins, este mês, streak e status). Ambos usam dados de `useMe`, `useMetrics` (profile feature) e as funções de cálculo da Task 3. Skeleton em cada card durante loading.

## Arquivos

- Create: `apps/frontend/src/features/dashboard/components/profile-hero-card.tsx`
- Create: `apps/frontend/src/features/dashboard/components/kpi-cards.tsx`

### Conformidade com as Skills Padrão

- react: composição, props tipados
- tailwindcss: grid responsivo, animate-pulse skeleton
- shadcn: design monocromático, border-border, bg-card, text-muted-foreground

## Passos

- [ ] **Step 1: Criar o componente `ProfileHeroCard`**

```tsx
// apps/frontend/src/features/dashboard/components/profile-hero-card.tsx
import { User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/features/profile/api"
import { cn } from "@/lib/cn"

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase()
}

function formatMemberSince(createdAt: string): string {
	return new Date(createdAt).toLocaleDateString("pt-BR", {
		month: "short",
		year: "numeric",
	})
}

interface ProfileHeroCardProps {
	totalCheckIns: number
	thisMonth: number
	streak: number
}

export function ProfileHeroCard({
	totalCheckIns,
	thisMonth,
	streak,
}: ProfileHeroCardProps) {
	const { data: me, isLoading } = useMe()

	if (isLoading) {
		return (
			<div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
				<Skeleton className="h-14 w-14 rounded-full" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-56" />
					<Skeleton className="h-4 w-20" />
				</div>
				<div className="ml-auto flex gap-6">
					<Skeleton className="h-12 w-12" />
					<Skeleton className="h-12 w-12" />
					<Skeleton className="h-12 w-12" />
				</div>
			</div>
		)
	}

	const isActive = me?.status === "activated"

	return (
		<div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
			{/* Avatar */}
			<div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold">
				{me?.name ? (
					getInitials(me.name)
				) : (
					<User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
				)}
			</div>

			{/* Info */}
			<div className="flex flex-col gap-1">
				<h2 className="text-base font-semibold">{me?.name ?? "—"}</h2>
				<p className="text-sm text-muted-foreground">{me?.email}</p>
				{me?.createdAt && (
					<p className="text-xs text-muted-foreground">
						Membro desde {formatMemberSince(me.createdAt)}
					</p>
				)}
				<span
					className={cn(
						"mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
						isActive
							? "border-green-800/30 bg-green-900/20 text-green-400"
							: "border-red-800/30 bg-red-900/20 text-red-400",
					)}
				>
					<span
						className={cn(
							"h-1.5 w-1.5 rounded-full",
							isActive ? "bg-green-400" : "bg-red-400",
						)}
						aria-hidden="true"
					/>
					{isActive ? "Conta ativa" : "Conta suspensa"}
				</span>
			</div>

			{/* Inline stats */}
			<div className="ml-auto flex gap-6">
				<div className="text-center">
					<p className="text-xl font-bold">{totalCheckIns}</p>
					<p className="text-xs text-muted-foreground">Total</p>
				</div>
				<div className="text-center">
					<p className="text-xl font-bold">{thisMonth}</p>
					<p className="text-xs text-muted-foreground">Este mês</p>
				</div>
				<div className="text-center">
					<p className="text-xl font-bold">{streak}</p>
					<p className="text-xs text-muted-foreground">Sequência</p>
				</div>
			</div>
		</div>
	)
}
```

- [ ] **Step 2: Criar o componente `KpiCards`**

```tsx
// apps/frontend/src/features/dashboard/components/kpi-cards.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { useMetrics } from "@/features/profile/api"
import { cn } from "@/lib/cn"

interface KpiCardProps {
	label: string
	value: string | number
	sub?: string
	isLoading?: boolean
	valueClassName?: string
}

function KpiCard({
	label,
	value,
	sub,
	isLoading,
	valueClassName,
}: KpiCardProps) {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			{isLoading ? (
				<>
					<Skeleton className="mb-1 h-8 w-16" />
					<Skeleton className="h-3 w-24" />
				</>
			) : (
				<>
					<p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
					{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
				</>
			)}
		</div>
	)
}

interface KpiCardsProps {
	thisMonth: number
	streak: number
	isHistoryLoading: boolean
}

export function KpiCards({
	thisMonth,
	streak,
	isHistoryLoading,
}: KpiCardsProps) {
	const { data: metrics, isLoading: isMetricsLoading } = useMetrics()

	const now = new Date()
	const monthLabel = now.toLocaleDateString("pt-BR", {
		month: "short",
		year: "numeric",
	})

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<KpiCard
				label="Total check-ins"
				value={metrics?.checkInsCount ?? 0}
				sub="Desde o início"
				isLoading={isMetricsLoading}
			/>
			<KpiCard
				label="Este mês"
				value={thisMonth}
				sub={monthLabel}
				isLoading={isHistoryLoading}
			/>
			<KpiCard
				label="Sequência atual"
				value={streak === 0 ? "—" : `${streak} dias`}
				sub="dias consecutivos"
				isLoading={isHistoryLoading}
			/>
			<KpiCard
				label="Status"
				value="Ativo"
				valueClassName="text-green-400"
				isLoading={false}
			/>
		</div>
	)
}
```

- [ ] **Step 3: Lint e type-check**

```bash
cd apps/frontend && pnpm lint:fix && pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/features/dashboard/components/profile-hero-card.tsx \
        apps/frontend/src/features/dashboard/components/kpi-cards.tsx
git commit -m "feat(frontend): add ProfileHeroCard and KpiCards dashboard components"
```

## Critérios de Sucesso

- `ProfileHeroCard` exibe avatar com iniciais, nome, email, data de cadastro e badge de status [RF-009, RF-010]
- `ProfileHeroCard` exibe stats inline: total, mês, streak [RF-011]
- `KpiCards` exibe 4 cards com skeleton durante loading [RF-012, RF-013]
- Badge de status usa cor semântica: verde (activated) / vermelho (suspended) [RF-010]
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
