# Task 3: UserFilterBar — versão mobile com Sheet [FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** task-01

## Visão Geral

Mesmo padrão da task-02 aplicado ao `UserFilterBar` da tela de listagem de usuários admin. Em mobile aparece botão "Filtros" com chip do filtro ativo. O Sheet contém os 5 filtros, Limpar (volta para "all") e Aplicar.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- code-style: adicionar `"use client"` pois o componente passará a usar `useState`
- no-workarounds: CSS toggle é a abordagem aprovada — não usar `useMediaQuery`

## Passos

- **Step 1: Escrever os testes para o comportamento mobile (antes de alterar o componente)**

Adicionar ao final de `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`:

```tsx
describe("UserFilterBar — mobile sheet", () => {
  test("exibe botão Filtros no DOM (versão mobile presente)", () => {
    render(
      <UserFilterBar activeFilter="all" stats={STATS} onFilterChange={vi.fn()} />,
    )
    expect(
      screen.getByRole("button", { name: /abrir filtros/i }),
    ).toBeInTheDocument()
  })

  test("exibe chip com label do filtro ativo quando não é all", () => {
    render(
      <UserFilterBar
        activeFilter="admin"
        stats={STATS}
        onFilterChange={vi.fn()}
      />,
    )
    expect(screen.getByText("Administradores")).toBeInTheDocument()
  })

  test("não exibe chip quando activeFilter é all", () => {
    render(
      <UserFilterBar activeFilter="all" stats={STATS} onFilterChange={vi.fn()} />,
    )
    // "Administradores", "Membros" não devem aparecer como chip ativo
    // (ainda aparecem como labels das tabs, mas o chip está ausente)
    const chips = screen
      .queryAllByText("Administradores")
      .filter((el) => el.tagName === "SPAN")
    expect(chips).toHaveLength(0)
  })

  test("abre o Sheet ao clicar no botão Filtros", async () => {
    render(
      <UserFilterBar activeFilter="all" stats={STATS} onFilterChange={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  test("chama onFilterChange com all ao clicar em Limpar", async () => {
    const onFilterChange = vi.fn()
    render(
      <UserFilterBar
        activeFilter="member"
        stats={STATS}
        onFilterChange={onFilterChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    await userEvent.click(screen.getByRole("button", { name: /^limpar$/i }))
    expect(onFilterChange).toHaveBeenCalledWith("all")
  })

  test("chama onFilterChange com pendingFilter ao clicar em Aplicar", async () => {
    const onFilterChange = vi.fn()
    render(
      <UserFilterBar
        activeFilter="all"
        stats={STATS}
        onFilterChange={onFilterChange}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    await userEvent.click(screen.getByRole("button", { name: /^aplicar$/i }))
    expect(onFilterChange).toHaveBeenCalledWith("all")
  })
})
```

- **Step 2: Rodar os testes novos para confirmar que falham (TDD)**

```bash
pnpm --filter frontend test -- src/features/admin/components/user-filter-bar.test.tsx
```

Expected: os 6 novos testes FALHAM com erro de comportamento inexistente.

- **Step 3: Reescrever o componente com suporte mobile**

Substituir o conteúdo completo de `apps/frontend/src/features/admin/components/user-filter-bar.tsx`:

```tsx
"use client"

import { Filter } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet"
import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import { cn } from "@/lib/cn"
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

const FILTER_LABEL: Record<UserFilter, string> = {
	all: "Todos",
	member: "Membros",
	admin: "Administradores",
	active: "Ativos",
	inactive: "Inativos",
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
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pendingFilter, setPendingFilter] = useState<UserFilter>(activeFilter)

	function openSheet() {
		setPendingFilter(activeFilter)
		setSheetOpen(true)
	}

	function applyFilter() {
		onFilterChange(pendingFilter)
		setSheetOpen(false)
	}

	function clearFilter() {
		onFilterChange("all")
		setSheetOpen(false)
	}

	return (
		<>
			{/* Desktop: inline filter bar */}
			<div className={cn("hidden md:block", className)}>
				<SegmentedControl
					aria-label="Filtrar usuários por categoria"
					items={buildItems(stats)}
					value={activeFilter}
					onValueChange={onFilterChange}
					countFloat={stats !== undefined}
				/>
			</div>

			{/* Mobile: botão + Sheet */}
			<div className="flex items-center gap-2 md:hidden">
				<Button
					variant="outline"
					size="sm"
					onClick={openSheet}
					aria-label="Abrir filtros"
				>
					<Filter className="mr-2 h-4 w-4" aria-hidden="true" />
					Filtros
				</Button>
				{activeFilter !== "all" && (
					<span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
						{FILTER_LABEL[activeFilter]}
					</span>
				)}
			</div>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="bottom" className="pb-8">
					<SheetHeader>
						<SheetTitle>Filtros</SheetTitle>
					</SheetHeader>
					<div className="mt-4 flex flex-col gap-4">
						<SegmentedControl
							aria-label="Selecionar filtro de usuários"
							items={buildItems(stats)}
							value={pendingFilter}
							onValueChange={setPendingFilter}
							countFloat={stats !== undefined}
						/>
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onClick={clearFilter}
							>
								Limpar
							</Button>
							<Button className="flex-1" onClick={applyFilter}>
								Aplicar
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</>
	)
}
```

- **Step 4: Rodar todos os testes do componente**

```bash
pnpm --filter frontend test -- src/features/admin/components/user-filter-bar.test.tsx
```

Expected: todos os testes PASSAM (6 existentes + 6 novos)

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 6: Commit**

```bash
cd apps/frontend
git add src/features/admin/components/user-filter-bar.tsx \
        src/features/admin/components/user-filter-bar.test.tsx
git commit -m "feat(admin): add mobile Sheet to UserFilterBar

Em mobile (<768px) substitui o SegmentedControl inline por botão
Filtros + Sheet bottom-sheet com Limpar/Aplicar. Filtro ativo
exibido como chip quando diferente de 'all'. Desktop inalterado.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-007: mesmas regras de Sheet + filtro da task-02 aplicadas ao UserFilterBar
- Chip exibido para todos os filtros exceto "all"
- Limpar chama `onFilterChange("all")`
- Todos os 6 testes existentes passam sem modificação
- `pnpm --filter frontend tsc:check` sem erros
