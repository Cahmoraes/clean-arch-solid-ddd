# Task 3: Controle de alternância na busca (SearchBar + SegmentedControl) [FR-001, FR-002, FR-003, FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-sim-gym-view-toggle.md`
**Spec:** `../specs/sim-gym-view-toggle-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Adicionar, dentro de `SearchBar`, uma instância do `SegmentedControl` (componente de design
system já existente em `@/components/ui/segmented-control`, usado hoje em
`CheckInFilterBar`, `PeriodSelector` e `UserFilterBar`) ligada diretamente a
`useGymViewStore` (task-01) — sem prop drilling, o mesmo estilo "não pai-filho direto" já
usado entre `SearchBar` e `GymResults` pela spec (D2: store Zustand global).

`SearchBar` é um componente compartilhado usado em três lugares: o header do
`AuthenticatedShell` (modo decorativo, via `onActivate`, que dispara o Command Palette), a
página `/academias` e a página `/admin/usuarios` (ambas em modo controlado, com
`value`/`onChange`). O escopo desta task é **apenas** `search-bar.tsx` — nenhuma página
chamadora é modificada. Por isso o toggle é renderizado no **branch controlado** do
componente (o mesmo branch usado tanto por `/academias` quanto por `/admin/usuarios`) e
**nunca** no branch decorativo (`onActivate`) — nesse modo o `SearchBar` inteiro já é um
`<button>`, e aninhar outro `<button>` do `SegmentedControl` dentro dele seria HTML
inválido. Consequência aceita e documentada: como o branch controlado é compartilhado, o
toggle também aparece em `/admin/usuarios` (que não tem noção de grid/lista) — isso é
inerente a reaproveitar um componente compartilhado + um store global sem tocar as páginas
chamadoras, exatamente como a spec (D2) descreve a wiring do estado.

## Arquivos

- Modify: `apps/frontend/src/components/ui/search-bar.tsx`
- Test: extends existing `apps/frontend/src/components/ui/search-bar.test.tsx`

### Conformidade com as Skills Padrão

- `mistica`: `SegmentedControl` é o componente de design system do projeto para alternância
  de opções — reaproveitar a instância existente, não recriar um controle próprio.
- `mistica-docs-query`: confirmar a API real de `SegmentedControl` (`items`, `value`,
  `onValueChange`, `aria-label`) antes de instanciar, em vez de assumir a assinatura.
- `vercel-composition-patterns`: extrair a instância em um subcomponente local
  (`GymViewToggle`) para manter `SearchBar` legível, no mesmo estilo de composição já usado
  no arquivo (branches claros por modo de uso).
- `zustand`: consumir `useGymViewStore` via seletores estreitos (`state.view`,
  `state.setView`), sem assinar o componente a mais estado do que o necessário.
- `tailwindcss`: nenhuma classe nova além das já produzidas pelo próprio
  `SegmentedControl`; não introduzir CSS ad-hoc para o layout do toggle.
- `code-style`: manter tabs, aspas duplas, sem ponto e vírgula e a ordem de import já
  convencionada no arquivo.
- `test-antipatterns`: testar o comportamento observável (roles/aria-pressed/estado real do
  store), sem mockar `SegmentedControl` nem o store sob teste.

## Passos

- **Step 1: Escrever os testes falhos do toggle**

Substituir o conteúdo de `apps/frontend/src/components/ui/search-bar.test.tsx` por:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { GYM_VIEW_COOKIE } from "@/lib/ui-state/gym-view-cookie"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"
import { SearchBar } from "./search-bar"

function clearGymViewCookie(): void {
	// biome-ignore lint/suspicious/noDocumentCookie: happy-dom não deleta cookie com max-age=0; usar expires no passado
	document.cookie = `${GYM_VIEW_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

beforeEach(() => {
	useGymViewStore.setState({ view: "grid" })
	clearGymViewCookie()
})

afterEach(clearGymViewCookie)

describe("SearchBar", () => {
	test("chama onActivate ao clicar no wrapper quando onActivate é fornecido", async () => {
		const onActivate = vi.fn()
		render(<SearchBar onActivate={onActivate} placeholder="buscar" />)
		await userEvent.click(screen.getByRole("button"))
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	test("chama onActivate ao pressionar Enter no wrapper", async () => {
		const onActivate = vi.fn()
		render(<SearchBar onActivate={onActivate} placeholder="buscar" />)
		screen.getByRole("button").focus()
		await userEvent.keyboard("{Enter}")
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	test("não renderiza como button quando onActivate não é fornecido", () => {
		render(<SearchBar placeholder="buscar" />)
		expect(
			screen.queryByRole("button", { name: "buscar" }),
		).not.toBeInTheDocument()
		expect(screen.getByPlaceholderText("buscar")).toBeInTheDocument()
	})

	test("exibe o toggle de visualização grid/lista quando onActivate não é fornecido (FR-001)", () => {
		render(<SearchBar placeholder="buscar" />)
		expect(
			screen.getByRole("group", {
				name: "Alternar visualização de academias",
			}),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Grade" })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
	})

	test("não exibe o toggle de visualização quando onActivate é fornecido (HTML válido, decorativo)", () => {
		render(<SearchBar onActivate={vi.fn()} placeholder="buscar" />)
		expect(
			screen.queryByRole("group", {
				name: "Alternar visualização de academias",
			}),
		).not.toBeInTheDocument()
	})

	test("clicar em Lista chama setView('list') e atualiza a seleção ativa (FR-002, FR-003)", async () => {
		render(<SearchBar placeholder="buscar" />)
		await userEvent.click(screen.getByRole("button", { name: "Lista" }))
		expect(useGymViewStore.getState().view).toBe("list")
		expect(screen.getByRole("button", { name: "Lista" })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.getByRole("button", { name: "Grade" })).toHaveAttribute(
			"aria-pressed",
			"false",
		)
	})

	test("opera o toggle via teclado (foco + Enter), mesmo padrão de acessibilidade da tela (FR-004)", async () => {
		render(<SearchBar placeholder="buscar" />)
		screen.getByRole("button", { name: "Lista" }).focus()
		await userEvent.keyboard("{Enter}")
		expect(useGymViewStore.getState().view).toBe("list")
	})
})
```

- **Step 2: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run src/components/ui/search-bar.test.tsx`
Expected: FAIL — `getByRole("group", { name: "Alternar visualização de academias" })` não
encontra elemento (o toggle ainda não existe em `SearchBar`).

- **Step 3: Implementar o toggle em SearchBar**

Substituir o conteúdo de `apps/frontend/src/components/ui/search-bar.tsx` por:

```tsx
"use client"

import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import {
	SegmentedControl,
	type SegmentedItem,
} from "@/components/ui/segmented-control"
import { cn } from "@/lib/cn"
import type { GymView } from "@/lib/ui-state/gym-view-cookie"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	showShortcut?: boolean
	/**
	 * When provided, renders as a keyboard-accessible button that triggers
	 * the Command Palette. The inner input is replaced with a decorative span.
	 */
	onActivate?: () => void
}

const GYM_VIEW_ITEMS: ReadonlyArray<SegmentedItem<GymView>> = [
	{ value: "grid", label: "Grade" },
	{ value: "list", label: "Lista" },
]

function GymViewToggle() {
	const view = useGymViewStore((state) => state.view)
	const setView = useGymViewStore((state) => state.setView)
	return (
		<SegmentedControl
			aria-label="Alternar visualização de academias"
			items={GYM_VIEW_ITEMS}
			value={view}
			onValueChange={setView}
		/>
	)
}

export function SearchBar({
	className,
	showShortcut = false,
	onActivate,
	placeholder,
	...inputProps
}: SearchBarProps) {
	const baseClasses = cn(
		"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
		className,
	)

	if (onActivate) {
		return (
			<button
				type="button"
				onClick={onActivate}
				className={cn(baseClasses, "cursor-pointer")}
			>
				<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
				<span className="flex-1 truncate text-left text-[15px] text-subtle">
					{placeholder}
				</span>
				{showShortcut && (
					<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
						⌘K
					</kbd>
				)}
			</button>
		)
	}

	return (
		<>
			<div className={baseClasses}>
				<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
				<input
					type="search"
					placeholder={placeholder}
					className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
					{...inputProps}
				/>
				{showShortcut && (
					<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
						⌘K
					</kbd>
				)}
			</div>
			<GymViewToggle />
		</>
	)
}
```

- **Step 4: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run src/components/ui/search-bar.test.tsx`
Expected: PASS (8 testes).

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; tsc sem erros.

- **Step 6: Commit**

```bash
git add apps/frontend/src/components/ui/search-bar.tsx apps/frontend/src/components/ui/search-bar.test.tsx
git commit -m "feat(gyms): toggle grid/lista na SearchBar via SegmentedControl"
```

## Critérios de Sucesso

- [ ] `SearchBar`, no modo controlado (sem `onActivate`), exibe um `SegmentedControl` com
      as opções "Grade" e "Lista" (FR-001).
- [ ] Clicar em uma opção chama `setView` do `gym-view-store` e troca a seleção ativa
      imediatamente, sem reload (FR-002, FR-003).
- [ ] O toggle é operável via teclado (foco + Enter/Space nativos do `<button>`) e tem
      `aria-label` próprio, mesmo padrão de acessibilidade já usado pelo `SegmentedControl`
      em outros pontos do app (FR-004).
- [ ] O modo decorativo (`onActivate`) permanece um único `<button>`, sem o toggle aninhado.
- [ ] `lint:fix` e `tsc:check` passam 100%.
