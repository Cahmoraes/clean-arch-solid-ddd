# Task 4: Componentes de composição — SegmentedControl, PageHeader, SearchBar, StatCard [RF-016, RF-017, RF-018]

**Status:** DONE
**PRD:** `../prd/prd-volt-redesign.md`
**Spec:** `../specs/volt-redesign-design.md`

## Visão Geral

Cria os componentes de composição VOLT reutilizados pelo dashboard e telas admin: o controle segmentado de filtros com contadores (`SegmentedControl`), o cabeçalho de página (`PageHeader`), a barra de busca (`SearchBar`) e o card de KPI (`StatCard`). Todos com utilities Tailwind sobre os tokens da Task 1, consumindo os primitivos da Task 3.

## Arquivos

- Create: `apps/frontend/src/components/ui/segmented-control.tsx`
- Create: `apps/frontend/src/components/ui/page-header.tsx`
- Create: `apps/frontend/src/components/ui/search-bar.tsx`
- Create: `apps/frontend/src/components/ui/stat-card.tsx`
- Test: `apps/frontend/src/components/ui/segmented-control.test.tsx`
- Test: `apps/frontend/src/components/ui/page-header.test.tsx`
- Test: `apps/frontend/src/components/ui/stat-card.test.tsx`

### Conformidade com as Skills Padrão

- use code-style: componentes controlados, props tipadas, booleanos semânticos
- use test-antipatterns: simular interação real (click → onChange), sem testar estado interno

## Passos

- [ ] **Step 1: Escrever os testes que falham**

Crie `apps/frontend/src/components/ui/segmented-control.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { SegmentedControl } from "./segmented-control"

const ITEMS = [
	{ value: "todos", label: "Todos", count: 12 },
	{ value: "ativos", label: "Ativos", count: 8 },
]

describe("SegmentedControl", () => {
	test("marca o item selecionado com aria-pressed", () => {
		render(<SegmentedControl items={ITEMS} value="todos" onValueChange={vi.fn()} />)
		expect(screen.getByRole("button", { name: /Todos/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
	})

	test("dispara onValueChange ao clicar em outro item", () => {
		const onChange = vi.fn()
		render(<SegmentedControl items={ITEMS} value="todos" onValueChange={onChange} />)
		fireEvent.click(screen.getByRole("button", { name: /Ativos/ }))
		expect(onChange).toHaveBeenCalledWith("ativos")
	})

	test("exibe o contador quando fornecido", () => {
		render(<SegmentedControl items={ITEMS} value="todos" onValueChange={vi.fn()} />)
		expect(screen.getByText("8")).toBeInTheDocument()
	})
})
```

Crie `apps/frontend/src/components/ui/page-header.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PageHeader } from "./page-header"

describe("PageHeader", () => {
	test("exibe título, eyebrow e subtítulo", () => {
		render(<PageHeader eyebrow="ADMIN" title="Usuários" subtitle="Gerencie a base" />)
		expect(screen.getByRole("heading", { name: "Usuários" })).toBeInTheDocument()
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
		expect(screen.getByText("Gerencie a base")).toBeInTheDocument()
	})

	test("renderiza a ação à direita quando fornecida", () => {
		render(<PageHeader title="Usuários" action={<button type="button">Convidar</button>} />)
		expect(screen.getByRole("button", { name: "Convidar" })).toBeInTheDocument()
	})
})
```

Crie `apps/frontend/src/components/ui/stat-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { Users } from "lucide-react"
import { describe, expect, test } from "vitest"
import { StatCard } from "./stat-card"

describe("StatCard", () => {
	test("exibe valor e label", () => {
		render(<StatCard icon={Users} value="312" label="Membros ativos" />)
		expect(screen.getByText("312")).toBeInTheDocument()
		expect(screen.getByText("Membros ativos")).toBeInTheDocument()
	})

	test("exibe delta com direção up", () => {
		render(<StatCard icon={Users} value="312" label="Membros" delta={{ value: "+4%", direction: "up" }} />)
		expect(screen.getByText("+4%")).toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar os testes para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "SegmentedControl"`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `segmented-control.tsx`**

```tsx
import { cn } from "@/lib/cn"

export interface SegmentedItem<T extends string = string> {
	value: T
	label: string
	count?: number
}

export interface SegmentedControlProps<T extends string = string> {
	items: ReadonlyArray<SegmentedItem<T>>
	value: T
	onValueChange: (value: T) => void
	className?: string
	"aria-label"?: string
}

export function SegmentedControl<T extends string = string>({
	items,
	value,
	onValueChange,
	className,
	"aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
	return (
		<div
			aria-label={ariaLabel}
			className={cn(
				"flex w-fit max-w-full flex-wrap gap-1.5 rounded-md border border-border bg-surface-2 p-1.5",
				className,
			)}
		>
			{items.map((item) => {
				const active = item.value === value
				return (
					<button
						key={item.value}
						type="button"
						aria-pressed={active}
						onClick={() => onValueChange(item.value)}
						className={cn(
							"inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
							active
								? "bg-foreground text-background dark:bg-accent dark:text-accent-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{item.label}
						{typeof item.count === "number" && (
							<span
								className={cn(
									"font-mono text-[11.5px] rounded-full px-1.5 py-0.5",
									active
										? "bg-background/20 dark:bg-accent-foreground/20"
										: "bg-foreground/10",
								)}
							>
								{item.count}
							</span>
						)}
					</button>
				)
			})}
		</div>
	)
}
```

- [ ] **Step 4: Implementar `page-header.tsx`**

```tsx
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"
import { Eyebrow } from "./eyebrow"

export interface PageHeaderProps {
	title: string
	eyebrow?: string
	subtitle?: string
	action?: ReactNode
	className?: string
}

export function PageHeader({
	title,
	eyebrow,
	subtitle,
	action,
	className,
}: PageHeaderProps) {
	return (
		<div
			className={cn(
				"mb-8 flex flex-wrap items-start justify-between gap-4",
				className,
			)}
		>
			<div className="flex flex-col gap-2">
				{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
				<h1 className="font-display text-[30px] font-semibold tracking-tight">
					{title}
				</h1>
				{subtitle && <p className="text-muted-foreground">{subtitle}</p>}
			</div>
			{action && <div className="flex items-center gap-2">{action}</div>}
		</div>
	)
}
```

- [ ] **Step 5: Implementar `search-bar.tsx`**

```tsx
import { Search } from "lucide-react"
import type { InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

export interface SearchBarProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
	className?: string
	/** Exibe a dica de atalho ⌘K à direita. Default: false. */
	showShortcut?: boolean
}

export function SearchBar({
	className,
	showShortcut = false,
	...inputProps
}: SearchBarProps) {
	return (
		<div
			className={cn(
				"flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
				className,
			)}
		>
			<Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
			<input
				type="search"
				className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
				{...inputProps}
			/>
			{showShortcut && (
				<kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
					⌘K
				</kbd>
			)}
		</div>
	)
}
```

- [ ] **Step 6: Implementar `stat-card.tsx`**

```tsx
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export interface StatDelta {
	value: string
	direction: "up" | "down"
}

export interface StatCardProps {
	icon: LucideIcon
	value: string
	label: string
	delta?: StatDelta
	/** Destaca o ícone com fundo accent. Default: false. */
	highlight?: boolean
	className?: string
}

export function StatCard({
	icon: Icon,
	value,
	label,
	delta,
	highlight = false,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"rounded-lg border border-border bg-card p-[22px] shadow-sm",
				className,
			)}
		>
			<div className="mb-[18px] flex items-center justify-between">
				<span
					className={cn(
						"inline-flex h-[42px] w-[42px] items-center justify-center rounded-md",
						highlight
							? "bg-accent text-accent-foreground"
							: "bg-surface-2 text-muted-foreground",
					)}
				>
					<Icon className="h-5 w-5" aria-hidden="true" />
				</span>
				{delta && (
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[12.5px] font-bold",
							delta.direction === "up"
								? "bg-success-soft text-success"
								: "bg-destructive-soft text-destructive",
						)}
					>
						{delta.value}
					</span>
				)}
			</div>
			<p className="font-mono text-[38px] font-bold leading-none tracking-tight tabular">
				{value}
			</p>
			<p className="mt-2 text-sm text-muted-foreground">{label}</p>
		</div>
	)
}
```

- [ ] **Step 7: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend test -- -t "SegmentedControl"`
Run: `pnpm --filter frontend test -- -t "PageHeader"`
Run: `pnpm --filter frontend test -- -t "StatCard"`
Expected: todos PASS.

- [ ] **Step 8: Lint, tsc, build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend build`
Expected: tudo verde.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/components/ui/segmented-control.tsx apps/frontend/src/components/ui/page-header.tsx apps/frontend/src/components/ui/search-bar.tsx apps/frontend/src/components/ui/stat-card.tsx apps/frontend/src/components/ui/segmented-control.test.tsx apps/frontend/src/components/ui/page-header.test.tsx apps/frontend/src/components/ui/stat-card.test.tsx
git commit -m "feat(volt-redesign): SegmentedControl, PageHeader, SearchBar e StatCard"
```

## Critérios de Sucesso

- `SegmentedControl` é controlado, marca ativo com `aria-pressed`, exibe contadores [RF-017, RF-018]
- `PageHeader` compõe eyebrow + título + subtítulo + ação
- `SearchBar` tem ícone leading e dica `⌘K` opcional
- `StatCard` exibe ícone, valor mono tabular, label e delta up/down [RF-016]
- `lint:fix`, `tsc:check`, `test` e `build` passam 100%
