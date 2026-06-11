# Task 5: `ActivityTab` (estado vazio gracioso) [RF-010, RF-011]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** N/A

## Visão Geral

Cria o conteúdo da aba **Atividade**. Como a API ainda não expõe histórico de auditoria, a tab recebe uma lista de eventos (vazia por padrão) e exibe um estado vazio gracioso ("Sem dados de atividade disponíveis") quando não há eventos — sem quebrar. A interface de evento é definida aqui para que, quando o backend de auditoria existir, baste passar os eventos.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: componente de apresentação, EmptyState
- use tailwindcss skill: layout de timeline e tokens
- use test-antipatterns skill + vitest skill: testes de renderização

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { ActivityTab, type UserActivityEvent } from "./activity-tab"

describe("ActivityTab", () => {
	test("exibe estado vazio quando não há eventos", () => {
		render(<ActivityTab events={[]} />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe estado vazio por padrão quando events é omitido", () => {
		render(<ActivityTab />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("renderiza a lista de eventos quando fornecida", () => {
		const events: UserActivityEvent[] = [
			{ id: "e1", description: "Conta criada", occurredAt: "12 Jan 2025" },
			{ id: "e2", description: "Login realizado", occurredAt: "Hoje" },
		]
		render(<ActivityTab events={events} />)
		expect(screen.getByText("Conta criada")).toBeInTheDocument()
		expect(screen.getByText("Login realizado")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "ActivityTab"`
Expected: FAIL — `Failed to resolve import "./activity-tab"`.

- **Step 3: Implementar o `ActivityTab`**

Crie `apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx`:

```tsx
import { Activity } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"

export interface UserActivityEvent {
	id: string
	description: string
	occurredAt: string
}

export interface ActivityTabProps {
	events?: UserActivityEvent[]
}

export function ActivityTab({ events = [] }: ActivityTabProps) {
	if (events.length === 0) {
		return (
			<EmptyState
				icon={Activity}
				title="Sem dados de atividade disponíveis"
				description="O histórico de atividade deste usuário ainda não está disponível."
			/>
		)
	}

	return (
		<ul className="flex flex-col gap-3">
			{events.map((event) => (
				<li key={event.id} className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-accent"
					/>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-foreground">{event.description}</span>
						<span className="text-xs text-muted-foreground">
							{event.occurredAt}
						</span>
					</div>
				</li>
			))}
		</ul>
	)
}
```

> Verifique a API real do `EmptyState` em `apps/frontend/src/components/ui/empty-state.tsx` (props `icon`, `title`, `description`) e do ícone `Activity` em `lucide-react`. Ambos já são usados no projeto.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "ActivityTab"`
Expected: PASS — 3 testes passam.

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/activity-tab.tsx apps/frontend/src/features/admin/components/user-detail/activity-tab.test.tsx
git commit -m "feat(frontend): add ActivityTab with graceful empty state"
```

## Critérios de Sucesso

- A aba exibe estado vazio gracioso quando não há eventos (RF-010, RF-011).
- O estado vazio é o comportamento padrão (props `events` opcional).
- A lista de eventos é renderizada corretamente quando fornecida.
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
