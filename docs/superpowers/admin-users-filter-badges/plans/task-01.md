# Task 1: Refatorar `UserFilterBar` — prop opcional e FloatBadge [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-008]

**Status:** DONE
**PRD:** `../prd/prd-admin-users-filter-badges.md`
**Spec:** `../specs/admin-users-filter-badges-design.md`
**Depends on:** N/A

## Visão Geral

Alterar `UserFilterBar` para aceitar `stats?: UserStats` (opcional) em vez de `counts: UserStats` (obrigatório), e habilitar `countFloat={stats !== undefined}` no `SegmentedControl`. Com isso:

- Quando `stats` é `undefined` (loading), os pills são renderizados **sem badge**.
- Quando `stats` está definido, o `SegmentedControl` renderiza `FloatBadge` (círculo verde flutuante no canto superior direito de cada pill).

Atualizar os testes existentes e adicionar cobertura para o caso `stats=undefined`.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: props de stats derivadas de `useQuery` devem ser opcionais para cobrir loading state
- `test-antipatterns`: testar comportamento observável (presença/ausência de badge no DOM), não implementação interna

## Passos

- **Step 1: Escrever os testes que vão falhar**

Substituir o conteúdo de `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { UserStats } from "../types"
import { UserFilterBar } from "./user-filter-bar"

const STATS: UserStats = {
	total: 48,
	members: 41,
	admins: 7,
	active: 45,
	inactive: 3,
}

describe("UserFilterBar", () => {
	test("deve renderizar as cinco tabs de filtro", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByRole("button", { name: /todos/i })).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /membros/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /administradores/i }),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^ativos/i })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /^inativos/i }),
		).toBeInTheDocument()
	})

	test("deve exibir os contadores em cada tab quando stats estão presentes", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByText("48")).toBeInTheDocument()
		expect(screen.getByText("41")).toBeInTheDocument()
		expect(screen.getByText("7")).toBeInTheDocument()
		expect(screen.getByText("45")).toBeInTheDocument()
		expect(screen.getByText("3")).toBeInTheDocument()
	})

	test("não deve exibir badges quando stats são undefined (loading)", () => {
		render(
			<UserFilterBar
				activeFilter="all"
				stats={undefined}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.queryByText("48")).not.toBeInTheDocument()
		expect(screen.queryByText("0")).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: /^todos$/i })).toBeInTheDocument()
	})

	test("deve marcar a tab ativa com aria-pressed=true", () => {
		render(
			<UserFilterBar
				activeFilter="member"
				stats={STATS}
				onFilterChange={vi.fn()}
			/>,
		)
		expect(screen.getByRole("button", { name: /membros/i })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.getByRole("button", { name: /todos/i })).toHaveAttribute(
			"aria-pressed",
			"false",
		)
	})

	test("deve chamar onFilterChange com o valor correto ao clicar em uma tab", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="all"
				stats={STATS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(
			screen.getByRole("button", { name: /administradores/i }),
		)
		expect(onFilterChange).toHaveBeenCalledWith("admin")
	})

	test("deve chamar onFilterChange com 'all' ao clicar em Todos", async () => {
		const onFilterChange = vi.fn()
		render(
			<UserFilterBar
				activeFilter="member"
				stats={STATS}
				onFilterChange={onFilterChange}
			/>,
		)
		await userEvent.click(screen.getByRole("button", { name: /todos/i }))
		expect(onFilterChange).toHaveBeenCalledWith("all")
	})
})
```

- **Step 2: Executar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- --run user-filter-bar
```

Saída esperada: 2–3 testes falhando com erro de prop desconhecida (`stats` vs `counts`) ou contadores ausentes.

- **Step 3: Implementar as mudanças em `user-filter-bar.tsx`**

Substituir o conteúdo de `apps/frontend/src/features/admin/components/user-filter-bar.tsx`:

```tsx
import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import type { UserFilter, UserStats } from "../types"

function buildItems(
	stats?: UserStats,
): ReadonlyArray<SegmentedItem<UserFilter>> {
	return [
		{ value: "all", label: "Todos", count: stats?.total },
		{ value: "member", label: "Membros", count: stats?.members },
		{ value: "admin", label: "Administradores", count: stats?.admins },
		{ value: "active", label: "Ativos", count: stats?.active },
		{ value: "inactive", label: "Inativos", count: stats?.inactive },
	]
}

export interface UserFilterBarProps {
	activeFilter: UserFilter
	stats?: UserStats
	onFilterChange: (filter: UserFilter) => void
	className?: string
}

export function UserFilterBar({
	activeFilter,
	stats,
	onFilterChange,
	className,
}: UserFilterBarProps) {
	return (
		<SegmentedControl
			aria-label="Filtrar usuários por categoria"
			items={buildItems(stats)}
			value={activeFilter}
			onValueChange={onFilterChange}
			className={className}
			countFloat={stats !== undefined}
		/>
	)
}
```

- **Step 4: Executar os testes para confirmar que passam**

```bash
pnpm --filter frontend test -- --run user-filter-bar
```

Saída esperada: `6 passed` (todos os testes verdes).

- **Step 5: Executar lint**

```bash
pnpm --filter frontend lint:fix
```

Saída esperada: nenhum erro.

- **Step 6: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Saída esperada: nenhum erro de tipo.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-filter-bar.tsx \
        apps/frontend/src/features/admin/components/user-filter-bar.test.tsx
git commit -m "feat(admin): make UserFilterBar stats optional with FloatBadge support"
```

## Critérios de Sucesso

- `user-filter-bar.test.tsx`: 6 testes passando, incluindo o caso `stats=undefined` sem badges
- Prop renomeada de `counts` para `stats`, agora opcional
- `countFloat={stats !== undefined}` adicionado ao `SegmentedControl`
- `pnpm lint:fix` e `pnpm tsc:check` sem erros
- RF-001..RF-008: verificados pelos testes
