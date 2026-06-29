# Task 1: Criar componente KpiCardWithSparkline [FR-007, FR-008, FR-009]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-analytics-dashboard-redesign.md`
**Spec:** `../specs/analytics-dashboard-redesign-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar o componente `KpiCardWithSparkline` que substitui o `StatCard` nos KPI cards de analytics, adicionando uma sparkline de tendência via SVG inline. O helper `buildSparklinePath` é extraído como função exportada para permitir testes unitários isolados. O card de retenção recebe tratamento visual destacado via prop `highlight`.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/kpi-card-with-sparkline.tsx`
- Create: `apps/frontend/src/features/admin/analytics/components/__tests__/kpi-card-with-sparkline.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: criação de componente visual com design system tokens (Tailwind v4, CSS vars)
- `react`: hooks (`useId`), props tipadas, lógica de renderização condicional
- `shadcn`: uso correto do `Skeleton` de `@/components/ui/skeleton`
- `tailwindcss`: classes Tailwind v4 com opacity modifiers (`/35`, `/[0.04]`) e tokens do `@theme`
- `no-workarounds`: SVG inline correto sem hacks de DOM; gradiente com `useId` para evitar conflito de IDs no SSR

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/analytics-dashboard-redesign-visual.md` (posição da sparkline: `absolute bottom-0 right-0`, `45% width`, `50% height`, `opacity: 0.35`; card highlight: `border-primary/35 bg-primary/[0.04]`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Ferramentas de fidelidade visual:** nenhuma configurada; construir manualmente a partir do mockup
- **Decisões visuais já tomadas:** sparkline SVG absolute no canto inferior direito do card, opacidade 0.35, sem interatividade; card de retenção com borda e fundo tintados em verde primário; skeleton na mesma dimensão do card (`h-28`)

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

  Ler `../specs/mockups/analytics-dashboard-redesign-visual.md` para confirmar layout, tokens e posição da sparkline. Não existe fonte de design original além do mockup curado.

- **Step 1: Escrever os testes com falha**

```tsx
// apps/frontend/src/features/admin/analytics/components/__tests__/kpi-card-with-sparkline.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	KpiCardWithSparkline,
	buildSparklinePath,
} from "../kpi-card-with-sparkline"

describe("buildSparklinePath", () => {
	test("retorna linha horizontal para array vazio", () => {
		expect(buildSparklinePath([])).toBe("M0,15 L80,15")
	})

	test("retorna linha horizontal para array com um único ponto", () => {
		expect(buildSparklinePath([10])).toBe("M0,15 L80,15")
	})

	test("retorna linha horizontal quando todos os valores são iguais", () => {
		expect(buildSparklinePath([5, 5, 5, 5])).toBe("M0,15 L80,15")
	})

	test("normaliza série crescente para viewBox 0 0 80 30", () => {
		// min=10 → y=28.0, max=30 → y=2.0, mid=20 → y=15.0; xStep=80/(3-1)=40
		expect(buildSparklinePath([10, 20, 30])).toBe(
			"M0.0,28.0 L40.0,15.0 L80.0,2.0",
		)
	})
})

describe("KpiCardWithSparkline", () => {
	test("exibe valor e label", () => {
		render(
			<KpiCardWithSparkline
				value="1.284"
				label="Check-ins no período"
				sparklineData={[10, 15, 12, 18]}
			/>,
		)
		expect(screen.getByText("1.284")).toBeInTheDocument()
		expect(screen.getByText("Check-ins no período")).toBeInTheDocument()
	})

	test("exibe elemento SVG quando sparklineData tem 2 ou mais pontos", () => {
		const { container } = render(
			<KpiCardWithSparkline
				value="82%"
				label="Taxa de retenção"
				sparklineData={[10, 15, 12, 18]}
			/>,
		)
		expect(container.querySelector("svg")).toBeInTheDocument()
	})

	test("não lança erro com sparklineData de valores todos iguais", () => {
		expect(() =>
			render(
				<KpiCardWithSparkline
					value="100"
					label="Teste"
					sparklineData={[5, 5, 5, 5]}
				/>,
			),
		).not.toThrow()
	})

	test("aplica classe border-primary quando highlight é true", () => {
		const { container } = render(
			<KpiCardWithSparkline
				value="82%"
				label="Taxa de retenção"
				sparklineData={[10, 15]}
				highlight
			/>,
		)
		expect(
			(container.firstChild as HTMLElement).className,
		).toContain("border-primary")
	})

	test("exibe Skeleton quando isLoading é true", () => {
		const { container } = render(
			<KpiCardWithSparkline
				value="82%"
				label="Taxa de retenção"
				sparklineData={[]}
				isLoading
			/>,
		)
		expect(container.querySelector('[data-testid="skeleton"]')).toBeInTheDocument()
	})

	test("exibe mensagem de erro quando isError é true", () => {
		render(
			<KpiCardWithSparkline
				value=""
				label="Check-ins no período"
				sparklineData={[]}
				isError
			/>,
		)
		expect(screen.getByText("Erro ao carregar dados")).toBeInTheDocument()
	})
})
```

- **Step 2: Executar testes para confirmar falha**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/kpi-card-with-sparkline.test.tsx --run
```

Esperado: FAIL — `Cannot find module '../kpi-card-with-sparkline'`

- **Step 3: Implementar o componente**

```tsx
// apps/frontend/src/features/admin/analytics/components/kpi-card-with-sparkline.tsx
"use client"

import { useId } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

interface KpiCardWithSparklineProps {
	value: string | number
	label: string
	sparklineData: number[]
	highlight?: boolean
	isLoading?: boolean
	isError?: boolean
}

export function buildSparklinePath(data: number[]): string {
	if (data.length < 2) return "M0,15 L80,15"
	const min = Math.min(...data)
	const max = Math.max(...data)
	if (max === min) return "M0,15 L80,15"
	const normalize = (v: number) => 28 - ((v - min) / (max - min)) * 26
	const xStep = 80 / (data.length - 1)
	return data
		.map(
			(v, i) =>
				`${i === 0 ? "M" : "L"}${(i * xStep).toFixed(1)},${normalize(v).toFixed(1)}`,
		)
		.join(" ")
}

export function KpiCardWithSparkline({
	value,
	label,
	sparklineData,
	highlight = false,
	isLoading = false,
	isError = false,
}: KpiCardWithSparklineProps) {
	const gradientId = useId()

	if (isLoading) {
		return <Skeleton className="h-28 w-full rounded-[14px]" data-testid="skeleton" />
	}

	if (isError) {
		return (
			<div className="flex h-28 items-center justify-center rounded-[14px] border border-destructive/30 bg-destructive/5 p-4">
				<p className="text-sm text-destructive">Erro ao carregar dados</p>
			</div>
		)
	}

	const path = buildSparklinePath(sparklineData)
	const areaPath = sparklineData.length >= 2 ? `${path} L80,30 L0,30 Z` : undefined

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-[14px] border px-5 pb-3.5 pt-[18px]",
				highlight
					? "border-primary/35 bg-primary/[0.04]"
					: "border-border bg-card",
			)}
		>
			<p
				className={cn(
					"font-mono text-[32px] font-bold leading-none",
					highlight && "text-primary",
				)}
			>
				{value}
			</p>
			<p className="mt-1 text-xs text-muted-foreground">{label}</p>
			<svg
				aria-hidden
				className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-[45%] opacity-35"
				viewBox="0 0 80 30"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="0%"
							stopColor="var(--color-primary)"
							stopOpacity="0.3"
						/>
						<stop
							offset="100%"
							stopColor="var(--color-primary)"
							stopOpacity="0"
						/>
					</linearGradient>
				</defs>
				<path
					d={path}
					fill="none"
					stroke="var(--color-primary)"
					strokeWidth="1.5"
				/>
				{areaPath && (
					<path d={areaPath} fill={`url(#${gradientId})`} />
				)}
			</svg>
		</div>
	)
}
```

- **Step 4: Executar testes para confirmar que passam**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/kpi-card-with-sparkline.test.tsx --run
```

Esperado: PASS — todos os 10 testes passando

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero erros em ambos os comandos

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/analytics/components/kpi-card-with-sparkline.tsx \
        apps/frontend/src/features/admin/analytics/components/__tests__/kpi-card-with-sparkline.test.tsx
git commit -m "feat(analytics): adiciona KpiCardWithSparkline com helper buildSparklinePath"
```

## Critérios de Sucesso

- `buildSparklinePath([])` retorna `"M0,15 L80,15"` (sem lançar erro) — FR-007
- `buildSparklinePath([5,5,5])` retorna `"M0,15 L80,15"` (valores iguais tratados) — FR-007
- Componente exibe SVG quando `sparklineData.length >= 2` — FR-007
- Componente com `highlight=true` aplica `border-primary/35 bg-primary/[0.04]` — FR-008
- Sparkline usa `var(--color-primary)` como cor de stroke — FR-007
- `isLoading=true` exibe `<Skeleton>` nas mesmas dimensões do card — FR-007
- `isError=true` exibe estado de erro sem lançar exceção — FR-007
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
