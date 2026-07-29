# Task 6: Modificar `GymResults` para alternar entre `GymCard`/`GymRow` conforme o store

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** standard
**Depends on:** task-03, task-05

## Visão Geral

`GymResults` passa a ler `view` do `useGymViewStore` (via seletor, para evitar re-renders desnecessários) e, para cada item da lista `items`, renderizar `GymCard` (quando `view === "cards"`) ou `GymRow` (quando `view === "rows"`). O container da lista (`<motion.ul>`) alterna sua classe Tailwind: grid (`grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]`) para `"cards"`, `flex flex-col` com borda/raio externo (`border rounded-[22px] overflow-hidden`, sem gap entre itens) para `"rows"`. Nenhuma alteração no fetch de dados — `gyms` já vem carregado via TanStack Query independentemente da view.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Modify (test): `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

### Conformidade com as Skills Padrão

- `zustand`: consumir `useGymViewStore` via seletor (`useGymViewStore((state) => state.view)`) em vez do objeto inteiro do store, evitando re-renders desnecessários de `GymResults`.
- `tailwindcss`: alternância condicional de classes do container (grid vs. flex-col com borda/raio) via `cn()`, replicando os tokens de raio do mockup (`rounded-[22px]`).
- `vercel-react-best-practices`: manter `ResultsList` como componente puro que só recebe `view` como prop adicional, sem introduzir estado local novo.
- `code-style`: preservar a estrutura existente do arquivo (`ResultsLoading`, `ResultsError`, `ResultsEmpty`, `ResultsList`, `GymContents`, `GymResults`) e a convenção de `data-testid` já usada.
- `test-antipatterns`: cobrir exatamente os 2 comportamentos da spec (view cards renderiza `GymCard` por item; view rows renderiza `GymRow` por item) sem duplicar os testes de loading/erro/edição já existentes.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Visualização em linhas" — container com `border: 1px solid var(--v-border); border-radius: var(--v-r-lg); overflow: hidden;` (raio `22px`), sem gap entre linhas.
- **Fonte de design original:** nenhuma; seguir o mockup curado (confirmado na spec, seção "Especificação Visual").
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta já registrada nesta sessão: não há.)
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou teste visual configurada neste ambiente para esta sessão — fidelidade construída manualmente contra o mockup curado.
- **Decisões visuais já tomadas (não refazer):** spec confirma que a visualização em linhas usa "o mesmo raio de borda externo do grid de cards" internamente à lista de linhas (borda entre itens dentro do container com raio externo único) — não recriar bordas individuais por `GymRow` além da já implementada na task 5 (borda inferior por linha fica a cargo do container/lista, não de `GymRow`).

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Fonte de design original e ferramentas de fidelidade já registradas acima (nenhuma disponível nesta sessão) — construir manualmente contra `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Visualização em linhas", reusando o raio de borda externo já decidido (`22px`).

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/features/gyms/components/gym-results.test.tsx (adicionar ao final do describe existente)
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"
// ... (imports existentes mantidos)

describe("GymResults — alternância de view", () => {
	beforeEach(() => {
		useGymViewStore.setState({ view: "cards", hydrated: false })
	})

	test("com view cards, renderiza GymCard por item", () => {
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getByTestId("gym-card-g1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-row-g1")).not.toBeInTheDocument()
	})

	test("com view rows, renderiza GymRow por item", () => {
		useGymViewStore.getState().setView("rows")
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getByTestId("gym-row-g1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-card-g1")).not.toBeInTheDocument()
	})
})
```

(`beforeEach`/`describe`/`import` são adicionados ao topo do arquivo já existente, junto dos imports atuais de `screen`, `describe`, `expect`, `test`, `Gym`, `renderWithProviders`, `GymResults`; o `beforeEach` novo fica dentro do describe adicional, sem alterar o `describe("GymResults", ...)` já existente.)

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test gym-results.test.tsx`
Expected: FAIL — `screen.queryByTestId("gym-row-g1")` nunca aparece porque `GymResults` sempre renderiza `GymCard`; o segundo teste falha em `expect(screen.getByTestId("gym-row-g1")).toBeInTheDocument()` com "Unable to find an element by: [data-testid=gym-row-g1]"

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/features/gyms/components/gym-results.tsx
"use client"

import { Search } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/gym-card"
import { GymCardSkeleton } from "@/features/gyms/components/gym-card-skeleton"
import { GymRow } from "@/features/gyms/components/gym-row"
import { cn } from "@/lib/cn"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"

const SKELETON_COUNT = 6

const listVariants = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07 } },
} as const

const cardVariants = {
	hidden: { opacity: 0, scale: 0.92 },
	show: {
		opacity: 1,
		scale: 1,
		transition: { type: "spring", stiffness: 280, damping: 22 },
	},
	exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
} as const

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
	const view = useGymViewStore((state) => state.view)
	return (
		<motion.ul
			data-testid="gym-results-list"
			variants={listVariants}
			initial="hidden"
			animate="show"
			className={cn(
				view === "cards"
					? "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
					: "flex flex-col overflow-hidden rounded-[22px] border border-border",
			)}
		>
			<AnimatePresence>
				{items.map((gym) => (
					<motion.li
						key={gym.id}
						variants={cardVariants}
						exit={cardVariants.exit}
						className={cn(
							view === "cards"
								? "flex flex-col"
								: "border-b border-border last:border-b-0",
						)}
					>
						{view === "cards" ? (
							<GymCard
								gym={gym}
								adminEditHref={
									isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
								}
							/>
						) : (
							<GymRow
								gym={gym}
								adminEditHref={
									isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
								}
							/>
						)}
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

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test gym-results.test.tsx`
Expected: PASS (todos os testes existentes + os 2 novos de alternância de view)

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-results.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx
git commit -m "feat: GymResults alterna entre GymCard e GymRow conforme GymViewStore"
```

## Critérios de Sucesso

- Com `useGymViewStore` em `view: "cards"`, `GymResults` renderiza `GymCard` por item (comportamento atual preservado).
- Com `view: "rows"`, `GymResults` renderiza `GymRow` por item.
- Container alterna entre `grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]` (cards) e `flex flex-col overflow-hidden rounded-[22px] border border-border` (rows).
- Nenhuma chamada de API nova é disparada pela troca de view.
- `pnpm --filter frontend test gym-results.test.tsx` 100% verde, incluindo os testes pré-existentes de `isAdmin`, loading e `gym-results-list`.
