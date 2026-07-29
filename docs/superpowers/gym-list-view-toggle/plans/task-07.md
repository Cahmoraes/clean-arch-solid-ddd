# Task 7: Adicionar toggle e hidratação client-only em `AcademiasContent`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/gym-list-view-toggle-design.md
**Tier:** standard
**Depends on:** task-02, task-03, task-04

## Visão Geral

Adiciona à toolbar de `AcademiasContent` (em `academias/page.tsx`), ao lado do campo de busca, o toggle de visualização: um `SegmentedControl` reutilizado com dois itens ícone-apenas (`LayoutGrid` para `"cards"`, `List` para `"rows"`, de `lucide-react`), disparando `useGymViewStore.getState().setView(...)` por clique. Adiciona também a hidratação client-only: um `useRef(false)` + leitura síncrona na montagem (replicando o ref-guard de `AuthenticatedShell`), lendo o cookie `gym_view` via `gym-view-cookie.ts` (task 2) e chamando `useGymViewStore.getState().hydrate(view)` (task 3) uma única vez. `(authenticated)/layout.tsx` não é tocado — ele só lê o cookie de sidebar, e não deve ler `gym_view` (D2 da spec).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify (test): `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`

### Conformidade com as Skills Padrão

- `zustand`: usar `useGymViewStore.getState()` fora de render para `hydrate`/`setView` (mesmo padrão de acesso imperativo já usado com `useSidebarCollapseStore.getState()` em `authenticated-shell.tsx`) e o hook seletor `useGymViewStore((state) => state.view)` para o valor exibido no `SegmentedControl`.
- `tailwindcss`: posicionar o `SegmentedControl` na toolbar existente (`flex flex-col gap-2 sm:flex-row sm:items-center`) sem quebrar o layout responsivo atual do formulário de busca.
- `vercel-react-best-practices`: replicar o padrão de hidratação síncrona por ref (`useRef(false)` checado fora de `useEffect`, no corpo do componente) já usado em `AuthenticatedShell`, evitando duplo efeito em React Strict Mode.
- `code-style`: manter a estrutura existente de `AcademiasContent` (hooks no topo, handlers depois, JSX por último) e a convenção de `data-testid` (`gym-view-toggle`).
- `test-antipatterns`: cobrir apenas o comportamento real (clique alterna a view exibida; hidratação lê o cookie uma única vez) sem testar detalhes internos do `SegmentedControl` já cobertos na task 4.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Toggle escolhido (Opção A)" — dois botões ícone-apenas, botão ativo com `background: var(--v-fg); color: var(--v-bg)`, posicionado na toolbar ao lado da busca.
- **Fonte de design original:** nenhuma; seguir o mockup curado (confirmado na spec, seção "Especificação Visual").
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela? (resposta já registrada nesta sessão: não há.)
- **Ferramentas de fidelidade visual:** nenhuma ferramenta de design-to-code ou teste visual configurada neste ambiente para esta sessão — fidelidade construída manualmente contra o mockup curado.
- **Decisões visuais já tomadas (não refazer):** D1 da spec fixa a reutilização do `SegmentedControl` genérico (não criar um toggle bespoke quadrado); D2 fixa a hidratação client-only via ref-guard dentro de `AcademiasContent`, sem tocar `(authenticated)/layout.tsx`; possível flash de 1 frame na view padrão antes da hidratação é aceito explicitamente (ver seção "Riscos" da spec).

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Fonte de design original e ferramentas de fidelidade já registradas acima (nenhuma disponível nesta sessão) — construir manualmente contra `../specs/mockups/gym-list-view-toggle-visual.md`, seção "Toggle escolhido (Opção A)", reusando `SegmentedControl` conforme D1 e o ref-guard conforme D2, sem re-derivar essas decisões.

- **Step 1: Write the failing test**

```tsx
// apps/frontend/src/app/(authenticated)/academias/page.test.tsx (adicionar dentro do describe existente)
// ... (imports existentes mantidos)

test("exibe o toggle de visualização na toolbar", () => {
	renderWithProviders(<AcademiasPage />)
	expect(screen.getByTestId("gym-view-toggle")).toBeInTheDocument()
})

test("clicar no item de linhas do toggle alterna a visualização para GymRow", async () => {
	server.use(
		http.get(`${apiBaseUrl}/gyms`, () =>
			HttpResponse.json({
				gyms: fakeGyms(2),
				pagination: { total: 2, page: 1, limit: 20 },
			}),
		),
	)
	const user = userEvent.setup()
	renderWithProviders(<AcademiasPage />)

	await screen.findByTestId("gym-card-gym-1")
	const toggle = screen.getByTestId("gym-view-toggle")
	await user.click(within(toggle).getByTestId("view-toggle-rows").closest("button")!)

	expect(await screen.findByTestId("gym-row-gym-1")).toBeInTheDocument()
	expect(screen.queryByTestId("gym-card-gym-1")).not.toBeInTheDocument()
})
```

(`within` já é importado no arquivo — usado no teste existente "links dos cards apontam para detalhe da academia". `view-toggle-rows` é o `data-testid` do ícone `List` usado como `label` do item `"rows"` em `VIEW_TOGGLE_ITEMS`, definido no Step 3 abaixo.)

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test academias/page.test.tsx`
Expected: FAIL — "Unable to find an element by: [data-testid=gym-view-toggle]" no primeiro teste novo, pois o toggle ainda não existe na toolbar

- **Step 3: Write minimal implementation**

```tsx
// apps/frontend/src/app/(authenticated)/academias/page.tsx
"use client"

import { LayoutGrid, List, Plus, Search } from "lucide-react"
import { MotionConfig } from "motion/react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useId, useRef, useState } from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SearchBar } from "@/components/ui/search-bar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useAllGyms, useGymsByName } from "@/features/gyms/api"
import { GymPagination } from "@/features/gyms/components/gym-pagination"
import { GymResults } from "@/features/gyms/components/gym-results"
import { useAuthStore } from "@/lib/auth/auth-store"
import { GYM_VIEW_COOKIE, parseGymViewCookie } from "@/lib/ui-state/gym-view-cookie"
import { type GymView, useGymViewStore } from "@/lib/ui-state/gym-view-store"

const RESULTS_PER_PAGE = 20

const VIEW_TOGGLE_ITEMS = [
	{
		value: "cards" as GymView,
		label: (
			<LayoutGrid
				data-testid="view-toggle-cards"
				className="h-4 w-4"
				aria-hidden="true"
			/>
		),
	},
	{
		value: "rows" as GymView,
		label: (
			<List
				data-testid="view-toggle-rows"
				className="h-4 w-4"
				aria-hidden="true"
			/>
		),
	},
]

function computeTotalPages(total: number | undefined): number {
	return Math.ceil((total ?? 0) / RESULTS_PER_PAGE)
}

function readGymViewCookie(): GymView {
	if (typeof document === "undefined") return "cards"
	const raw = document.cookie
		.split("; ")
		.find((row) => row.startsWith(`${GYM_VIEW_COOKIE}=`))
		?.split("=")[1]
	return parseGymViewCookie(raw)
}

interface AcademiasContentProps {
	initialSearch: string
}

function AcademiasContent({ initialSearch }: AcademiasContentProps) {
	const user = useAuthStore((state) => state.user)
	const isAdmin = user?.role === "ADMIN"
	const inputId = useId()
	const [draftQuery, setDraftQuery] = useState(initialSearch)
	const [submittedQuery, setSubmittedQuery] = useState(initialSearch)
	const [page, setPage] = useState(1)

	const hydratedViewRef = useRef(false)
	if (!hydratedViewRef.current) {
		useGymViewStore.getState().hydrate(readGymViewCookie())
		hydratedViewRef.current = true
	}
	const view = useGymViewStore((state) => state.view)

	const trimmed = submittedQuery.trim()
	const isBrowseMode = trimmed.length === 0

	const allGymsQuery = useAllGyms({ page, enabled: isBrowseMode })
	const searchQuery = useGymsByName({ name: trimmed, page })
	const activeQuery = isBrowseMode ? allGymsQuery : searchQuery
	const items = activeQuery.data?.items ?? []
	const totalPages = computeTotalPages(activeQuery.data?.total)
	const showPagination =
		!activeQuery.isLoading && !activeQuery.isError && items.length > 0

	function onSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmittedQuery(draftQuery)
		setPage(1)
	}

	return (
		<MotionConfig reducedMotion="user">
			<PageContainer
				as="section"
				width="wide"
				aria-labelledby="academias-title"
				className="gap-0"
			>
				<PageHeader
					eyebrow="Rede"
					title="Academias"
					subtitle="Busque por nome ou navegue pelas academias disponíveis."
					action={
						isAdmin ? (
							<Button asChild variant="primary" size="sm">
								<Link
									href="/admin/academias/nova"
									data-testid="gym-create-link"
								>
									<Plus aria-hidden className="h-4 w-4" />
									Cadastrar
								</Link>
							</Button>
						) : undefined
					}
				/>

				<form
					onSubmit={onSearch}
					className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
					aria-label="Buscar academias"
				>
					<label htmlFor={inputId} className="sr-only">
						Buscar academias por nome
					</label>
					<SearchBar
						id={inputId}
						data-testid="gym-search-input"
						placeholder="Buscar academia por nome"
						value={draftQuery}
						onChange={(event) => setDraftQuery(event.target.value)}
						className="w-full sm:max-w-md"
					/>
					<Button type="submit" data-testid="gym-search-submit">
						<Search aria-hidden className="h-4 w-4" />
						Buscar
					</Button>
					<div data-testid="gym-view-toggle" className="sm:ml-auto">
						<SegmentedControl
							items={VIEW_TOGGLE_ITEMS}
							value={view}
							onValueChange={(next) => useGymViewStore.getState().setView(next)}
							aria-label="Alternar visualização"
						/>
					</div>
				</form>

				<div data-testid="gym-results" className="flex flex-col gap-4">
					<GymResults
						query={trimmed}
						isBrowseMode={isBrowseMode}
						isLoading={activeQuery.isLoading}
						isError={activeQuery.isError}
						errorMessage={activeQuery.error?.userMessage}
						onRetry={() => activeQuery.refetch()}
						items={items}
						isAdmin={isAdmin}
					/>
				</div>

				{showPagination ? (
					<div className="mt-8">
						<GymPagination
							page={page}
							totalPages={totalPages}
							onChange={setPage}
						/>
					</div>
				) : null}
			</PageContainer>
		</MotionConfig>
	)
}

function AcademiasPageInner() {
	const searchParams = useSearchParams()
	const initialSearch = searchParams?.get("search") ?? ""
	return <AcademiasContent initialSearch={initialSearch} />
}

export default function AcademiasPage() {
	return (
		<Suspense fallback={<AcademiasContent initialSearch="" />}>
			<AcademiasPageInner />
		</Suspense>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test academias/page.test.tsx`
Expected: PASS (todos os testes existentes + os 2 novos do toggle)

- **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/academias/page.tsx" "apps/frontend/src/app/(authenticated)/academias/page.test.tsx"
git commit -m "feat: adiciona toggle de visualização e hidratação client-only em AcademiasContent"
```

## Critérios de Sucesso

- Toggle (`SegmentedControl` com `LayoutGrid`/`List`) aparece na toolbar de `/academias`, ao lado da busca, com `data-testid="gym-view-toggle"`.
- Clicar no item de linhas chama `useGymViewStore.getState().setView("rows")` e `GymResults` passa a renderizar `GymRow`.
- Hidratação client-only: na montagem, `useGymViewStore.getState().hydrate(view)` é chamado exatamente uma vez, lendo o cookie `gym_view` via `parseGymViewCookie`/`GYM_VIEW_COOKIE` da task 2.
- `apps/frontend/src/app/(authenticated)/layout.tsx` não foi modificado.
- Teste manual (fora do escopo do teste automatizado, documentado aqui conforme a spec): abrir `/academias`, clicar no toggle, confirmar que a visualização muda e que, após um reload de página, a preferência persiste (cookie `gym_view` lido corretamente).
- `pnpm --filter frontend test academias/page.test.tsx` 100% verde, incluindo os 13 testes pré-existentes do arquivo.
