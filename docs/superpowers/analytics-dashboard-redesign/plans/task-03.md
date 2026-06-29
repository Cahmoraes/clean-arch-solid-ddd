# Task 3: Criar componente RetentionMiniStats [FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-analytics-dashboard-redesign.md`
**Spec:** `../specs/analytics-dashboard-redesign-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Criar o componente `RetentionMiniStats` que exibe os valores de membros ativos, inativos e taxa de churn em um row compacto de 3 pills, sempre visível abaixo dos KPI cards. Não há seção colapsável — os números são expostos diretamente. `inactiveCount` e `churnRate` aparecem em `text-destructive` para indicar seu caráter de atenção.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/retention-mini-stats.tsx`
- Create: `apps/frontend/src/features/admin/analytics/components/__tests__/retention-mini-stats.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: row compacto de pills com `grid-cols-3`; valores em `font-mono`; cores semânticas para métricas negativas
- `react`: props tipadas, renderização condicional para skeleton
- `tailwindcss`: `grid-cols-3 gap-2.5`, `rounded-lg`, `border-border bg-card`, tokens de cor semânticos
- `shadcn`: uso do `Skeleton` para estado de carregamento

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/analytics-dashboard-redesign-visual.md` (3 pills em grid, `height ~44px`, valor em monospace, inativos e churn em vermelho)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Ferramentas de fidelidade visual:** nenhuma configurada
- **Decisões visuais já tomadas:** pills com `bg-card border-border rounded-lg`; valor alinhado à direita; label em `text-muted-foreground text-xs`; skeleton: 3 pills de `h-11` na mesma disposição

## Passos

- **Step 1: Escrever os testes com falha**

```tsx
// apps/frontend/src/features/admin/analytics/components/__tests__/retention-mini-stats.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { RetentionMiniStats } from "../retention-mini-stats"

describe("RetentionMiniStats", () => {
	test("exibe activeCount, inactiveCount e churnRate", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		expect(screen.getByText("312")).toBeInTheDocument()
		expect(screen.getByText("44")).toBeInTheDocument()
		expect(screen.getByText("4,2%")).toBeInTheDocument()
	})

	test("exibe inactiveCount em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("44")
		expect(value.className).toContain("text-destructive")
	})

	test("exibe churnRate em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("4,2%")
		expect(value.className).toContain("text-destructive")
	})

	test("activeCount NÃO está em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("312")
		expect(value.className).not.toContain("text-destructive")
	})

	test("formata churnRate com uma casa decimal e símbolo %", () => {
		render(
			<RetentionMiniStats
				activeCount={100}
				inactiveCount={10}
				churnRate={5.555}
				isLoading={false}
			/>,
		)
		expect(screen.getByText("5,6%")).toBeInTheDocument()
	})

	test("exibe 3 Skeletons quando isLoading é true", () => {
		const { container } = render(
			<RetentionMiniStats
				activeCount={0}
				inactiveCount={0}
				churnRate={0}
				isLoading
			/>,
		)
		const skeletons = container.querySelectorAll('[data-testid="skeleton"]')
		expect(skeletons).toHaveLength(3)
	})
})
```

- **Step 2: Executar testes para confirmar falha**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/retention-mini-stats.test.tsx --run
```

Esperado: FAIL — `Cannot find module '../retention-mini-stats'`

- **Step 3: Implementar o componente**

```tsx
// apps/frontend/src/features/admin/analytics/components/retention-mini-stats.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

interface RetentionMiniStatsProps {
	activeCount: number
	inactiveCount: number
	churnRate: number
	isLoading: boolean
}

interface StatPillProps {
	label: string
	value: string
	destructive?: boolean
}

function StatPill({ label, value, destructive = false }: StatPillProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span
				className={cn(
					"font-mono text-sm font-bold",
					destructive && "text-destructive",
				)}
			>
				{value}
			</span>
		</div>
	)
}

export function RetentionMiniStats({
	activeCount,
	inactiveCount,
	churnRate,
	isLoading,
}: RetentionMiniStatsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-3 gap-2.5">
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
				<Skeleton className="h-11 w-full rounded-lg" data-testid="skeleton" />
			</div>
		)
	}

	return (
		<div className="grid grid-cols-3 gap-2.5">
			<StatPill
				label="Membros ativos"
				value={activeCount.toLocaleString("pt-BR")}
			/>
			<StatPill
				label="Inativos"
				value={inactiveCount.toLocaleString("pt-BR")}
				destructive
			/>
			<StatPill
				label="Taxa de churn"
				value={`${churnRate.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
				destructive
			/>
		</div>
	)
}
```

> **Nota sobre formatação:** `toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })` formata o número com separador decimal vírgula e 1 casa decimal — `4.2` → `"4,2"`, `5.555` → `"5,6"` (arredondamento automático).

- **Step 4: Executar testes para confirmar que passam**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/retention-mini-stats.test.tsx --run
```

Esperado: PASS — todos os 6 testes passando

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero erros em ambos

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/analytics/components/retention-mini-stats.tsx \
        apps/frontend/src/features/admin/analytics/components/__tests__/retention-mini-stats.test.tsx
git commit -m "feat(analytics): adiciona RetentionMiniStats com pills de ativos, inativos e churn"
```

## Critérios de Sucesso

- `activeCount`, `inactiveCount` e `churnRate` visíveis sem interação — FR-010
- `inactiveCount` e `churnRate` em `text-destructive` — FR-011
- `activeCount` sem `text-destructive` — FR-011
- `churnRate` formatado com 1 casa decimal e `%` — FR-010
- 3 Skeletons quando `isLoading=true` — FR-010
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
