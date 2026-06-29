# Task 2: Criar componente AtRiskAlertZone [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-analytics-dashboard-redesign.md`
**Spec:** `../specs/analytics-dashboard-redesign-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Criar o componente `AtRiskAlertZone` que exibe a lista de membros em risco de churn imediatamente abaixo do seletor de período. Mostra os 3 primeiros membros por padrão (ordenados por `daysSinceLastCheckIn` decrescente), com toggle local para ver todos. Quando `members.length === 0`, exibe `HealthyZone` (estado verde de confirmação). Badge de dias em vermelho quando `>= 18` dias (crítico), âmbar abaixo do threshold.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx`
- Create: `apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: design da zona de alerta com estado âmbar e estado verde; hierarquia visual entre header e lista de membros
- `react`: `useState` para toggle `showAll`; renderização condicional sem if-else aninhados profundos (cognitiva ≤ 5)
- `tailwindcss`: tokens `bg-warning-soft`, `border-warning/25`, `bg-success-soft`, `border-success/25`, `bg-surface-2` — todos definidos em `@theme` de `globals.css`
- `shadcn`: uso correto do `Skeleton` de `@/components/ui/skeleton`
- `no-workarounds`: lógica de ordenação via spread `[...members].sort(...)` para evitar mutação; constante `AT_RISK_CRITICAL_THRESHOLD` para threshold de dias

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/analytics-dashboard-redesign-visual.md` (at-risk zone: `bg-warning-soft`, `border-warning/25`, `rounded-[14px]`; membro row: `bg-surface-2`, avatar com 2 iniciais; HealthyZone: `bg-success-soft`, `border-success/25`)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Ferramentas de fidelidade visual:** nenhuma configurada; construir manualmente a partir do mockup
- **Decisões visuais já tomadas:** zona âmbar (não vermelho) como cor de identidade da alerta; vermelho reservado para badges individuais críticos (≥ 18 dias); HealthyZone verde com `text-primary`; avatar do membro: círculo com as 2 primeiras letras do nome em `bg-surface-3`

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

  Ler `../specs/mockups/analytics-dashboard-redesign-visual.md` para confirmar tokens visuais da at-risk zone e da healthy zone antes de implementar.

- **Step 1: Escrever os testes com falha**

```tsx
// apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { AtRiskAlertZone } from "../at-risk-alert-zone"

const fourMembers = [
	{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 },
	{ id: "2", name: "Carlos Lima", daysSinceLastCheckIn: 15 },
	{ id: "3", name: "Maria Silva", daysSinceLastCheckIn: 10 },
	{ id: "4", name: "João Souza", daysSinceLastCheckIn: 8 },
]

describe("AtRiskAlertZone", () => {
	test("exibe zona âmbar quando há membros em risco", () => {
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		expect(
			screen.getByText(/membros em risco de churn/i),
		).toBeInTheDocument()
	})

	test("exibe HealthyZone quando lista de membros está vazia", () => {
		render(<AtRiskAlertZone members={[]} isLoading={false} />)
		expect(screen.getByText("Academia saudável")).toBeInTheDocument()
	})

	test("exibe apenas os 3 primeiros membros por padrão", () => {
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		expect(screen.getByText("Ana Santos")).toBeInTheDocument()
		expect(screen.getByText("Carlos Lima")).toBeInTheDocument()
		expect(screen.getByText("Maria Silva")).toBeInTheDocument()
		expect(screen.queryByText("João Souza")).not.toBeInTheDocument()
	})

	test("ordena membros por daysSinceLastCheckIn decrescente", () => {
		const unordered = [
			{ id: "a", name: "Primeiro", daysSinceLastCheckIn: 5 },
			{ id: "b", name: "Segundo", daysSinceLastCheckIn: 21 },
			{ id: "c", name: "Terceiro", daysSinceLastCheckIn: 12 },
		]
		render(<AtRiskAlertZone members={unordered} isLoading={false} />)
		const items = screen.getAllByRole("listitem")
		// O item com 21 dias deve aparecer primeiro
		expect(items[0]).toHaveTextContent("Segundo")
	})

	test("'ver todos' revela membros além dos 3 primeiros", async () => {
		const user = userEvent.setup()
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		await user.click(screen.getByRole("button", { name: /ver todos/i }))
		expect(screen.getByText("João Souza")).toBeInTheDocument()
	})

	test("não exibe botão 'ver todos' quando há 3 ou menos membros", () => {
		render(
			<AtRiskAlertZone members={fourMembers.slice(0, 3)} isLoading={false} />,
		)
		expect(
			screen.queryByRole("button", { name: /ver todos/i }),
		).not.toBeInTheDocument()
	})

	test("exibe badge em cor destrutiva para membro com >= 18 dias sem check-in", () => {
		render(
			<AtRiskAlertZone
				members={[{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 }]}
				isLoading={false}
			/>,
		)
		const badge = screen.getByText("21 dias sem check-in")
		expect(badge.className).toContain("text-destructive")
	})

	test("exibe badge em cor âmbar para membro com < 18 dias sem check-in", () => {
		render(
			<AtRiskAlertZone
				members={[{ id: "2", name: "Carlos Lima", daysSinceLastCheckIn: 15 }]}
				isLoading={false}
			/>,
		)
		const badge = screen.getByText("15 dias sem check-in")
		expect(badge.className).toContain("text-warning")
	})

	test("exibe Skeleton quando isLoading é true", () => {
		const { container } = render(
			<AtRiskAlertZone members={[]} isLoading />,
		)
		expect(container.querySelector('[data-testid="skeleton"]')).toBeInTheDocument()
	})
})
```

- **Step 2: Executar testes para confirmar falha**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx --run
```

Esperado: FAIL — `Cannot find module '../at-risk-alert-zone'`

- **Step 3: Implementar o componente**

```tsx
// apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx
"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"

const AT_RISK_CRITICAL_THRESHOLD = 18

interface AtRiskMember {
	id: string
	name: string
	daysSinceLastCheckIn: number
}

interface AtRiskAlertZoneProps {
	members: AtRiskMember[]
	isLoading: boolean
}

function MemberRow({ member }: { member: AtRiskMember }) {
	const isCritical = member.daysSinceLastCheckIn >= AT_RISK_CRITICAL_THRESHOLD
	return (
		<li className="flex items-center gap-3 rounded-[6px] bg-surface-2 px-3 py-2">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold uppercase">
				{member.name.slice(0, 2)}
			</div>
			<span className="text-sm font-medium">{member.name}</span>
			<span
				className={cn(
					"ml-auto text-xs font-semibold",
					isCritical ? "text-destructive" : "text-warning",
				)}
			>
				{member.daysSinceLastCheckIn} dias sem check-in
			</span>
		</li>
	)
}

export function AtRiskAlertZone({ members, isLoading }: AtRiskAlertZoneProps) {
	const [showAll, setShowAll] = useState(false)

	if (isLoading) {
		return <Skeleton className="h-16 w-full rounded-[14px]" data-testid="skeleton" />
	}

	if (members.length === 0) {
		return (
			<div className="flex items-center gap-3 rounded-[14px] border border-success/25 bg-success-soft px-5 py-3">
				<CheckCircle2 className="size-4 shrink-0 text-primary" />
				<div>
					<p className="font-semibold text-primary">Academia saudável</p>
					<p className="text-xs text-muted-foreground">
						Nenhum membro em risco de churn nos últimos 30 dias
					</p>
				</div>
			</div>
		)
	}

	const sorted = [...members].sort(
		(a, b) => b.daysSinceLastCheckIn - a.daysSinceLastCheckIn,
	)
	const visible = showAll ? sorted : sorted.slice(0, 3)
	const hasMore = sorted.length > 3

	return (
		<div className="rounded-[14px] border border-warning/25 bg-warning-soft px-5 py-4">
			<div className="flex items-center gap-2">
				<AlertTriangle className="size-4 shrink-0 text-warning" />
				<span className="font-bold text-warning">
					{members.length}{" "}
					{members.length === 1 ? "membro em risco" : "membros em risco"} de churn
				</span>
				{hasMore && (
					<button
						type="button"
						onClick={() => setShowAll((prev) => !prev)}
						className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
					>
						{showAll ? "ver menos" : "ver todos"}
					</button>
				)}
			</div>
			<ul className="mt-3 space-y-2">
				{visible.map((member) => (
					<MemberRow key={member.id} member={member} />
				))}
			</ul>
		</div>
	)
}
```

- **Step 4: Executar testes para confirmar que passam**

```bash
pnpm --filter frontend test -- src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx --run
```

Esperado: PASS — todos os 9 testes passando

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero erros em ambos

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/analytics/components/at-risk-alert-zone.tsx \
        apps/frontend/src/features/admin/analytics/components/__tests__/at-risk-alert-zone.test.tsx
git commit -m "feat(analytics): adiciona AtRiskAlertZone com estados de alerta e saudável"
```

## Critérios de Sucesso

- Zona âmbar exibida quando `members.length > 0` — FR-001
- Apenas 3 primeiros membros visíveis por padrão, ordenados por `daysSinceLastCheckIn` desc — FR-002
- Nome e dias exibidos por membro — FR-003
- Badge em `text-destructive` quando `daysSinceLastCheckIn >= 18`, `text-warning` abaixo — FR-004
- Botão "ver todos" revela membros restantes na mesma tela — FR-005
- `HealthyZone` verde exibida quando `members.length === 0` — FR-006
- `isLoading=true` exibe `<Skeleton>` — FR-006
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
