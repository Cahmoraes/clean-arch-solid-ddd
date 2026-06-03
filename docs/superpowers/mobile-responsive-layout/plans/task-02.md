# Task 2: CheckInFilterBar — versão mobile com Sheet [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** task-01

## Visão Geral

Adiciona versão mobile ao `CheckInFilterBar` usando CSS toggle (`hidden md:block` / `flex md:hidden`) e um Sheet bottom-sheet para conter os filtros. No desktop o comportamento é idêntico ao atual. No mobile (<768px) aparece um botão "Filtros" com chip indicador do filtro ativo e um Sheet que só aplica o filtro ao clicar em "Aplicar" (fechar sem aplicar descarta).

## Arquivos

- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`
- Modify: `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- code-style: adicionar `"use client"` pois o componente passará a usar `useState`
- no-workarounds: CSS toggle é a abordagem aprovada — não usar `useMediaQuery`

## Passos

- **Step 1: Escrever os testes para o comportamento mobile (antes de alterar o componente)**

Adicionar no final de `apps/frontend/src/features/check-ins/components/check-in-filter-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { CheckInStats } from "../api/extended-paths.js"
import { CheckInFilterBar } from "./check-in-filter-bar"

// (testes existentes permanecem inalterados acima)

describe("CheckInFilterBar — mobile sheet", () => {
  test("exibe botão Filtros no DOM (versão mobile presente)", () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(
      screen.getByRole("button", { name: /abrir filtros/i }),
    ).toBeInTheDocument()
  })

  test("exibe chip com label do filtro ativo quando status é definido", () => {
    render(
      <CheckInFilterBar status="pending" onStatusChange={vi.fn()} />,
    )
    expect(screen.getByText("Pendentes")).toBeInTheDocument()
  })

  test("não exibe chip quando status é undefined", () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    // "Pendentes", "Aprovados", "Rejeitados" não devem aparecer como chip
    expect(screen.queryByText("Aprovados")).not.toBeInTheDocument()
    expect(screen.queryByText("Rejeitados")).not.toBeInTheDocument()
  })

  test("abre o Sheet ao clicar no botão Filtros e exibe os itens", async () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getAllByText("Todos").length).toBeGreaterThanOrEqual(1)
  })

  test("chama onStatusChange com pendingStatus ao clicar em Aplicar", async () => {
    const onStatusChange = vi.fn()
    render(
      <CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    // Clicar em "Pendentes" dentro do sheet
    const dialog = screen.getByRole("dialog")
    await userEvent.click(
      dialog.querySelector("button[aria-pressed]")!.closest("fieldset")!
        .querySelectorAll("button")[1],
    )
    await userEvent.click(screen.getByRole("button", { name: /^aplicar$/i }))
    expect(onStatusChange).toHaveBeenCalledWith("pending")
  })

  test("chama onStatusChange com undefined ao clicar em Limpar", async () => {
    const onStatusChange = vi.fn()
    render(
      <CheckInFilterBar status="pending" onStatusChange={onStatusChange} />,
    )
    await userEvent.click(screen.getByRole("button", { name: /abrir filtros/i }))
    await userEvent.click(screen.getByRole("button", { name: /^limpar$/i }))
    expect(onStatusChange).toHaveBeenCalledWith(undefined)
  })
})
```

- **Step 2: Rodar os testes novos para confirmar que falham (TDD)**

```bash
pnpm --filter frontend test -- src/features/check-ins/components/check-in-filter-bar.test.tsx
```

Expected: os 5 novos testes do describe "mobile sheet" FALHAM com erro de componente não encontrado ou comportamento inexistente.

- **Step 3: Reescrever o componente com suporte mobile**

Substituir o conteúdo completo de `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`:

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
import type { CheckInStats } from "../api/extended-paths.js"
import type { CheckInFilterStatus } from "../hooks/use-check-in-filters.js"

type FilterValue = "todos" | "pending" | "validated" | "rejected"

const STATUS_LABEL: Record<NonNullable<CheckInFilterStatus>, string> = {
	pending: "Pendentes",
	validated: "Aprovados",
	rejected: "Rejeitados",
}

function buildItems(
	stats?: CheckInStats,
): ReadonlyArray<SegmentedItem<FilterValue>> {
	return [
		{ value: "todos", label: "Todos", count: stats?.total },
		{ value: "pending", label: "Pendentes", count: stats?.pending },
		{ value: "validated", label: "Aprovados", count: stats?.validated },
		{ value: "rejected", label: "Rejeitados", count: stats?.rejected },
	]
}

function toFilterValue(status: CheckInFilterStatus): FilterValue {
	return status ?? "todos"
}

function toStatus(value: FilterValue): CheckInFilterStatus {
	return value === "todos" ? undefined : value
}

export interface CheckInFilterBarProps {
	status: CheckInFilterStatus
	onStatusChange: (status: CheckInFilterStatus) => void
	stats?: CheckInStats
}

export function CheckInFilterBar({
	status,
	onStatusChange,
	stats,
}: CheckInFilterBarProps) {
	const [sheetOpen, setSheetOpen] = useState(false)
	const [pendingStatus, setPendingStatus] =
		useState<CheckInFilterStatus>(status)

	function openSheet() {
		setPendingStatus(status)
		setSheetOpen(true)
	}

	function applyFilter() {
		onStatusChange(pendingStatus)
		setSheetOpen(false)
	}

	function clearFilter() {
		onStatusChange(undefined)
		setSheetOpen(false)
	}

	return (
		<>
			{/* Desktop: inline filter bar */}
			<div className="hidden md:block">
				<SegmentedControl
					aria-label="Filtrar check-ins por status"
					items={buildItems(stats)}
					value={toFilterValue(status)}
					onValueChange={(value) => onStatusChange(toStatus(value))}
					className="w-full [&>button]:flex-1 [&>button]:justify-center"
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
				{status && (
					<span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
						{STATUS_LABEL[status]}
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
							aria-label="Selecionar filtro de status"
							items={buildItems(stats)}
							value={toFilterValue(pendingStatus)}
							onValueChange={(value) => setPendingStatus(toStatus(value))}
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
pnpm --filter frontend test -- src/features/check-ins/components/check-in-filter-bar.test.tsx
```

Expected: todos os testes PASSAM (incluindo os 4 anteriores + 5 novos)

- **Step 5: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 6: Commit**

```bash
cd apps/frontend
git add src/features/check-ins/components/check-in-filter-bar.tsx \
        src/features/check-ins/components/check-in-filter-bar.test.tsx
git commit -m "feat(check-ins): add mobile Sheet to CheckInFilterBar

Em mobile (<768px) substitui o SegmentedControl inline por botão
Filtros + Sheet bottom-sheet com Limpar/Aplicar. Estado pendente
descartado ao fechar sem Aplicar. Desktop inalterado.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-001: em viewport <768px, o SegmentedControl inline está oculto (`hidden md:block`)
- FR-002: Sheet abre ao clicar no botão "Filtros"
- FR-003: Sheet contém SegmentedControl + botões Limpar e Aplicar
- FR-004: fechar o Sheet sem Aplicar não chama `onStatusChange`
- FR-005: chip indicador exibido quando `status !== undefined`
- FR-006: desktop inalterado — SegmentedControl inline visível em ≥768px
- Todos os testes existentes passam sem modificação
