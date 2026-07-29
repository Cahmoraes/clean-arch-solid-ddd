# Task 4: Visualização em lista (GymRow + GymResults) [FR-009, FR-010, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-sim-gym-view-toggle.md`
**Spec:** `../specs/sim-gym-view-toggle-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Criar `GymRow`, um item de linha única para a visualização em lista de `/academias`
(FR-010), espelhando a estrutura `<li>` de `CheckInItem` (thumbnail pequena + texto,
`rounded-lg border border-border bg-card`), mas mantendo o mesmo destino de navegação
clicável que `GymCard` já tem hoje: `href="/academias/{id}"` cobrindo toda a área visível
da linha (FR-011). Em seguida, `GymResults` passa a ler `view` de `useGymViewStore` (task-01)
e escolher, por item, entre `GymCard` (grid, inalterado) e `GymRow` (lista, novo) — FR-009.
Nenhuma lógica nova de estado é introduzida aqui: o switch consome o store real que a task-01
já criou.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-row.test.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Test: extends existing `apps/frontend/src/features/gyms/components/gym-results.test.tsx`

### Conformidade com as Skills Padrão

- `mistica`: nenhum componente de design system novo é necessário — `GymRow` é composição
  de HTML semântico (`li`/`Link`) e do já existente `GymImage`, sem duplicar um padrão que o
  design system já resolve.
- `mistica-docs-query`: n/a para esta task (nenhuma API de Mistica nova é consultada).
- `vercel-composition-patterns`: `GymRow` é um Server Component puro (sem `"use client"`),
  igual a `GymCard` — a interatividade fica isolada em `GymImage`, que já é client.
- `tailwindcss`: reaproveitar exatamente as classes já em produção em `CheckInItem` para o
  layout de linha, em vez de inventar um novo espaçamento.
- `zustand`: `GymResults`/`GymContents` leem `useGymViewStore` via seletor estreito
  (`state.view`), sem introduzir estado próprio para a escolha de layout.
- `code-style`: manter tabs, aspas duplas, sem ponto e vírgula e a ordem de import já
  convencionada nos arquivos.
- `test-antipatterns`: testar o DOM renderizado (roles, testids, atributos), sem mockar
  `GymImage` nem o store sob teste.

## Passos

- **Step 1: Escrever os testes falhos de GymRow**

Criar `apps/frontend/src/features/gyms/components/gym-row.test.tsx`:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymRow } from "./gym-row"

const gymWithImage: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: "Academia completa",
	phone: null,
	address: "Rua A, 100",
	imageKey: "gyms/volt.webp",
	latitude: -23.5,
	longitude: -46.6,
}

const gymWithoutImageOrAddress: Gym = {
	id: "g2",
	title: "VOLT Sul",
	description: null,
	phone: null,
	address: null,
	imageKey: null,
	latitude: -23.6,
	longitude: -46.7,
}

describe("GymRow", () => {
	test("exibe o nome da academia (FR-010)", () => {
		renderWithProviders(<GymRow gym={gymWithImage} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	})

	test("exibe o endereço quando disponível (FR-010)", () => {
		renderWithProviders(<GymRow gym={gymWithImage} />)
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
	})

	test("usa lat/lng como fallback de localização quando não há endereço", () => {
		renderWithProviders(<GymRow gym={gymWithoutImageOrAddress} />)
		expect(screen.getByText("-23.6000, -46.7000")).toBeInTheDocument()
	})

	test("exibe a imagem da academia quando imageKey está presente", () => {
		renderWithProviders(<GymRow gym={gymWithImage} />)
		const image = screen.getByTestId("gym-image")
		expect(image).toHaveAttribute("alt", "VOLT Centro")
	})

	test("exibe o placeholder de imagem quando imageKey é null", () => {
		renderWithProviders(<GymRow gym={gymWithoutImageOrAddress} />)
		expect(screen.getByTestId("gym-image-placeholder")).toBeInTheDocument()
	})

	test("navega para o detalhe da academia ao clicar na linha (FR-011)", () => {
		renderWithProviders(<GymRow gym={gymWithImage} />)
		expect(screen.getByTestId("gym-row-g1-link")).toHaveAttribute(
			"href",
			"/academias/g1",
		)
	})

	test("a raiz do componente é um item de lista <li> (FR-009)", () => {
		const { container } = renderWithProviders(<GymRow gym={gymWithImage} />)
		const root = container.querySelector("[data-testid='gym-row-g1']")
		expect(root?.tagName).toBe("LI")
	})
})
```

- **Step 2: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run src/features/gyms/components/gym-row.test.tsx`
Expected: FAIL — `Cannot find module './gym-row'`.

- **Step 3: Implementar GymRow**

Criar `apps/frontend/src/features/gyms/components/gym-row.tsx`:

```tsx
import { MapPin } from "lucide-react"
import Link from "next/link"
import type { Gym } from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"

export interface GymRowProps {
	gym: Gym
}

function resolveLocation(gym: Gym): string {
	if (gym.address) return gym.address
	return `${gym.latitude.toFixed(4)}, ${gym.longitude.toFixed(4)}`
}

export function GymRow({ gym }: GymRowProps) {
	return (
		<li data-testid={`gym-row-${gym.id}`}>
			<Link
				href={`/academias/${gym.id}`}
				data-testid={`gym-row-${gym.id}-link`}
				className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-[border-color] duration-300 ease-out hover:border-border-strong"
			>
				<GymImage
					imageKey={gym.imageKey}
					alt={gym.title}
					className="h-11 w-11 flex-shrink-0 rounded-[13px]"
					hoverEffect={false}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[15px] font-semibold text-card-foreground">
						{gym.title}
					</p>
					<p className="flex items-center gap-1.5 truncate text-[13px] text-muted-foreground">
						<MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
						<span className="truncate">{resolveLocation(gym)}</span>
					</p>
				</div>
			</Link>
		</li>
	)
}
```

- **Step 4: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run src/features/gyms/components/gym-row.test.tsx`
Expected: PASS (7 testes).

- **Step 5: Escrever os testes falhos do switch grid/lista em GymResults**

Substituir o conteúdo de
`apps/frontend/src/features/gyms/components/gym-results.test.tsx` por:

```tsx
import { screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { useGymViewStore } from "@/lib/ui-state/gym-view-store"
import { renderWithProviders } from "@/test/render"
import { GymResults } from "./gym-results"

const gyms: Gym[] = [
	{
		id: "g1",
		title: "VOLT Centro",
		description: null,
		phone: null,
		address: "Rua A, 100",
		imageKey: null,
		latitude: -23.5,
		longitude: -46.6,
	},
	{
		id: "g2",
		title: "VOLT Sul",
		description: null,
		phone: null,
		address: "Rua B, 200",
		imageKey: null,
		latitude: -23.6,
		longitude: -46.7,
	},
]

function baseProps() {
	return {
		query: "",
		isBrowseMode: true,
		isLoading: false,
		isError: false,
		onRetry: () => {},
		items: gyms,
	}
}

afterEach(() => {
	useGymViewStore.setState({ view: "grid" })
})

describe("GymResults", () => {
	test("exibe link de edição em cada card quando isAdmin é verdadeiro", () => {
		renderWithProviders(<GymResults {...baseProps()} isAdmin />)
		expect(screen.getByTestId("gym-edit-g1")).toHaveAttribute(
			"href",
			"/admin/academias/g1/editar",
		)
		expect(screen.getByTestId("gym-edit-g2")).toHaveAttribute(
			"href",
			"/admin/academias/g2/editar",
		)
	})

	test("não exibe link de edição quando isAdmin é falso", () => {
		renderWithProviders(<GymResults {...baseProps()} isAdmin={false} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
		expect(screen.queryByTestId("gym-edit-g2")).not.toBeInTheDocument()
	})

	test("não exibe link de edição quando isAdmin é omitido", () => {
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
	})

	test("exibe esqueletos GymCardSkeleton no estado de loading", () => {
		renderWithProviders(<GymResults {...baseProps()} isLoading items={[]} />)
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

	test("por padrão (view=grid) renderiza GymCard e não GymRow (FR-009)", () => {
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getByTestId("gym-card-g1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-row-g1")).not.toBeInTheDocument()
	})

	test("quando view=list renderiza GymRow e não GymCard (FR-009)", () => {
		useGymViewStore.setState({ view: "list" })
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getByTestId("gym-row-g1")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-card-g1")).not.toBeInTheDocument()
	})

	test("view=list exibe nome e localização de cada linha (FR-010)", () => {
		useGymViewStore.setState({ view: "list" })
		renderWithProviders(<GymResults {...baseProps()} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
		expect(screen.getByTestId("gym-row-g1-link")).toHaveAttribute(
			"href",
			"/academias/g1",
		)
	})
})
```

- **Step 6: Rodar os testes e ver falhar**

Run: `pnpm --filter frontend test -- --run src/features/gyms/components/gym-results.test.tsx`
Expected: FAIL — os 3 novos testes falham (`gym-row-g1` nunca existe; em `view=list` o card
ainda é renderizado, pois `GymResults` ainda não lê `useGymViewStore`).

- **Step 7: Implementar o switch grid/lista em GymResults**

Substituir o conteúdo de
`apps/frontend/src/features/gyms/components/gym-results.tsx` por:

```tsx
"use client"

import { Search } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import type { Gym } from "@/features/gyms/api"
import { GymCard } from "@/features/gyms/components/gym-card"
import { GymCardSkeleton } from "@/features/gyms/components/gym-card-skeleton"
import { GymRow } from "@/features/gyms/components/gym-row"
import type { GymView } from "@/lib/ui-state/gym-view-cookie"
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

function ResultsList({
	items,
	isAdmin,
	view,
}: {
	items: Gym[]
	isAdmin?: boolean
	view: GymView
}) {
	return (
		<motion.ul
			data-testid="gym-results-list"
			variants={listVariants}
			initial="hidden"
			animate="show"
			className={
				view === "list"
					? "flex flex-col gap-3"
					: "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]"
			}
		>
			<AnimatePresence>
				{items.map((gym) =>
					view === "list" ? (
						<GymRow key={gym.id} gym={gym} />
					) : (
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
					),
				)}
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
	const view = useGymViewStore((state) => state.view)
	if (isLoading) return <ResultsLoading />
	if (isError) return <ResultsError message={errorMessage} onRetry={onRetry} />
	if (items.length > 0) {
		return <ResultsList items={items} isAdmin={isAdmin} view={view} />
	}
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

- **Step 8: Rodar os testes e ver passar**

Run: `pnpm --filter frontend test -- --run src/features/gyms/components/gym-results.test.tsx`
Expected: PASS (9 testes).

- **Step 9: Suíte completa + lint + tipos + build**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test -- --run && pnpm --filter frontend build`
Expected: zero problemas Biome; tsc sem erros; todos os testes passam; build conclui.

- **Step 10: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-row.tsx apps/frontend/src/features/gyms/components/gym-row.test.tsx apps/frontend/src/features/gyms/components/gym-results.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx
git commit -m "feat(gyms): visualização em lista com GymRow (FR-009, FR-010, FR-011)"
```

## Critérios de Sucesso

- [ ] `GymRow` exibe thumbnail pequena (`GymImage`, com placeholder quando `imageKey` é
      null), nome e localização (endereço ou lat/lng) em uma única linha (FR-010).
- [ ] `GymRow` navega para `/academias/{id}` ao clicar em qualquer ponto da linha, mesmo
      destino de `GymCard` (FR-011).
- [ ] `GymResults`/`GymContents` leem `view` de `useGymViewStore` real (task-01) e
      alternam entre `GymCard` (grid) e `GymRow` (lista) sem duplicar estado (FR-009).
- [ ] Todos os testes pré-existentes de `gym-results.test.tsx` continuam passando
      inalterados no modo grid (default).
- [ ] `lint:fix`, `tsc:check`, `test` e `build` passam 100%.
