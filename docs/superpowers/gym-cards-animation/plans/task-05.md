# Task 05: Adicionar stagger/AnimatePresence no GymResults [FR-001, FR-002, FR-003, FR-013, FR-014, FR-015]

**Status:** PENDING
**PRD:** `../prd/prd-gym-cards-animation.md`
**Spec:** `../specs/gym-cards-animation-design.md`
**Depends on:** task-01, task-02

## Visão Geral

Converte `ResultsList` de `<ul>/<li>` HTML puros para `motion.ul/motion.li` com variants de stagger e `AnimatePresence`. Substitui o `<Skeleton>` genérico em `ResultsLoading` pelo `<GymCardSkeleton>` criado na task-02. Adiciona novos testes para o comportamento de stagger e loading skeleton.

**Variants a usar:**
```ts
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}
```

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

### Conformidade com as Skills Padrão

- code-style: tabs, aspas duplas, importar `AnimatePresence` e `motion` de `"motion/react"`
- no-workarounds: stagger é via Motion variants, não via CSS delays manuais

## Passos

### Step 1: Adicionar testes para o novo comportamento (vão falhar inicialmente)

Adicionar ao final de `apps/frontend/src/features/gyms/components/gym-results.test.tsx`, dentro do `describe("GymResults")`:

```tsx
test("exibe esqueletos GymCardSkeleton no estado de loading", () => {
	renderWithProviders(
		<GymResults {...baseProps()} isLoading items={[]} />,
	)
	const loadingContainer = screen.getByTestId("gym-results-loading")
	const skeletons = loadingContainer.querySelectorAll(
		"[data-testid='gym-card-skeleton']",
	)
	expect(skeletons.length).toBe(6)
})

test("a lista de resultados é renderizada em um motion.ul com data-testid", () => {
	renderWithProviders(<GymResults {...baseProps()} />)
	expect(screen.getByTestId("gym-results-list")).toBeInTheDocument()
})

test("cada card é renderizado em um motion.li dentro do motion.ul", () => {
	renderWithProviders(<GymResults {...baseProps()} />)
	const list = screen.getByTestId("gym-results-list")
	const listItems = list.querySelectorAll("li")
	expect(listItems.length).toBe(2)
})
```

Para usar o novo import, adicionar no topo do arquivo de testes:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymResults } from "./gym-results"
```

(O import já existe — apenas adicionar os `test` blocks no `describe`.)

### Step 2: Rodar os testes para confirmar que os novos falham

```bash
pnpm --filter frontend test:run -- -t "GymResults"
```

Resultado esperado: FAIL — 3 novos testes falham (`gym-card-skeleton` não existe no loading, `gym-results-list` não existe).

### Step 3: Implementar as mudanças no GymResults

Substituir o conteúdo completo de `apps/frontend/src/features/gyms/components/gym-results.tsx`:

```tsx
"use client"

import { AnimatePresence, motion } from "motion/react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/gym-card"
import { GymCardSkeleton } from "@/features/gyms/components/gym-card-skeleton"

const SKELETON_COUNT = 6

const listVariants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
	hidden: { opacity: 0, scale: 0.92 },
	show: {
		opacity: 1,
		scale: 1,
		transition: { type: "spring", stiffness: 280, damping: 22 },
	},
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

export interface GymResultsProps {
	query: string
	isBrowseMode?: boolean
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	items: Gym[]
	isAdmin?: boolean
}

function ResultsLoading() {
	return (
		<div
			data-testid="gym-results-loading"
			className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
		>
			{Array.from({ length: SKELETON_COUNT }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are not reorderable
				<GymCardSkeleton key={index} />
			))}
		</div>
	)
}

function ResultsError({
	message,
	onRetry,
}: {
	message?: string
	onRetry: () => void
}) {
	return (
		<EmptyState
			title="Não foi possível buscar academias"
			description={message ?? "Tente novamente."}
			action={
				<Button
					variant="outline"
					onClick={onRetry}
					data-testid="gym-results-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function ResultsEmpty({ query }: { query: string }) {
	return (
		<EmptyState
			icon={Search}
			title="Nenhuma academia encontrada"
			description={`Não encontramos resultados para "${query}". Tente outro termo.`}
		/>
	)
}

function ResultsEmptyBrowse() {
	return (
		<EmptyState
			icon={Search}
			title="Nenhuma academia cadastrada"
			description="Ainda não há academias disponíveis no sistema."
		/>
	)
}

function ResultsList({ items, isAdmin }: { items: Gym[]; isAdmin?: boolean }) {
	return (
		<motion.ul
			data-testid="gym-results-list"
			variants={listVariants}
			initial="hidden"
			animate="show"
			className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
		>
			<AnimatePresence>
				{items.map((gym) => (
					<motion.li
						key={gym.id}
						variants={cardVariants}
						exit={cardVariants.exit}
						className="flex flex-col"
					>
						<GymCard
							gym={gym}
							adminEditHref={
								isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
							}
						/>
					</motion.li>
				))}
			</AnimatePresence>
		</motion.ul>
	)
}

function ResultsNoQuery() {
	return (
		<EmptyState
			icon={Search}
			title="Comece pela busca"
			description="Digite o nome de uma academia e pressione Buscar."
		/>
	)
}

function GymContents({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	items,
	query,
	isAdmin,
}: Omit<GymResultsProps, "isBrowseMode">) {
	if (isLoading) return <ResultsLoading />
	if (isError) return <ResultsError message={errorMessage} onRetry={onRetry} />
	if (items.length > 0) return <ResultsList items={items} isAdmin={isAdmin} />
	return query ? <ResultsEmpty query={query} /> : <ResultsEmptyBrowse />
}

export function GymResults({
	query,
	isBrowseMode = false,
	...rest
}: GymResultsProps) {
	if (!isBrowseMode && !query) return <ResultsNoQuery />
	return <GymContents query={query} {...rest} />
}
```

**Mudanças principais:**
- Remove import `Skeleton`, adiciona imports `AnimatePresence, motion` e `GymCardSkeleton`
- Adiciona `listVariants` e `cardVariants` como constantes de módulo
- `ResultsLoading`: `Skeleton className="h-[260px]"` → `GymCardSkeleton`
- `ResultsList`: `ul` → `motion.ul` com `data-testid="gym-results-list"` + variants + `initial/animate`; `li` → `motion.li` com `variants/exit`; `AnimatePresence` envolve os items

### Step 4: Rodar todos os testes do GymResults para confirmar que passam

```bash
pnpm --filter frontend test:run -- -t "GymResults"
```

Resultado esperado: PASS — todos os 6 testes verdes (3 originais + 3 novos).

### Step 5: Rodar a suite completa dos componentes gyms para verificar regressões

```bash
pnpm --filter frontend test:run -- --reporter=verbose src/features/gyms
```

Resultado esperado: todos os testes passam.

### Step 6: Rodar lint e typecheck

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Resultado esperado: 0 erros Biome, 0 erros TypeScript.

### Step 7: Commit

```bash
git add apps/frontend/src/features/gyms/components/gym-results.tsx \
        apps/frontend/src/features/gyms/components/gym-results.test.tsx
git commit -m "feat(frontend): adicionar stagger/AnimatePresence no GymResults

- Converte ul/li para motion.ul/motion.li com variants de stagger
- AnimatePresence envolve items para animação de saída (exit)
- ResultsLoading usa GymCardSkeleton (task-02) em vez de Skeleton genérico
- Novos testes: skeleton no loading, motion.ul data-testid, li count

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm --filter frontend test:run -- -t "GymResults"` passa com 6 testes verdes
- `pnpm --filter frontend biome:fix` reporta zero problemas
- `pnpm --filter frontend tsc:check` passa sem erros
- `gym-results.tsx` importa `AnimatePresence, motion` de `"motion/react"` [FR-003, FR-005]
- `ResultsList` usa `motion.ul` com `variants={listVariants}` e `staggerChildren: 0.07` [FR-001, FR-002]
- `ResultsList` usa `motion.li` com `variants={cardVariants}` e `exit` [FR-003, FR-014]
- `AnimatePresence` envolve os items mapeados [FR-014]
- `ResultsLoading` usa `GymCardSkeleton` × 6 (não mais `Skeleton`) [FR-013]
- `motion.ul` tem `data-testid="gym-results-list"` [FR-001, FR-015]
