# Task 2: `GymResults` — prop `isAdmin` + repasse de `adminEditHref` por card

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-edit-entrypoint-design.md`
**Depends on:** task-01

## Visão Geral

Adicionar a prop opcional `isAdmin?: boolean` ao `GymResults`. Quando verdadeira, cada
`GymCard` da lista recebe `adminEditHref={`/admin/academias/${gym.id}/editar`}`; quando
falsa ou omitida, recebe `undefined`. O `GymResults` é o ponto que **deriva** o href de
edição a partir do id da academia, mantendo o `GymCard` agnóstico do formato da rota.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-results.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-results.test.tsx` (criar)

### Conformidade com as Skills Padrão

- use `react`: propagação de prop por composição, sem estado novo.
- use `test-antipatterns`: testar o contrato observável (href presente/ausente por card), não a estrutura interna.
- use `vitest`: novo arquivo de teste com `renderWithProviders`.

## Passos

- **Step 1: Criar o arquivo de teste falhando**

Criar `apps/frontend/src/features/gyms/components/gym-results.test.tsx` com:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
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
})
```

- **Step 2: Rodar e confirmar que falha**

Run: `pnpm --filter frontend test -- src/features/gyms/components/gym-results.test.tsx`
Expected: FAIL — `gym-edit-g1` não encontrado (prop `isAdmin` ainda não propagada) e
possível erro de tipo `isAdmin` inexistente em `GymResultsProps`.

- **Step 3: Adicionar `isAdmin` à interface e propagar**

Em `apps/frontend/src/features/gyms/components/gym-results.tsx`:

3a. Acrescentar a prop à interface `GymResultsProps` (após `items: Gym[]`):

```tsx
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
```

3b. Atualizar `ResultsList` para receber e usar `isAdmin`:

```tsx
function ResultsList({
	items,
	isAdmin,
}: {
	items: Gym[]
	isAdmin?: boolean
}) {
	return (
		<ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[18px]">
			{items.map((gym) => (
				<li key={gym.id} className="flex flex-col">
					<GymCard
						gym={gym}
						adminEditHref={
							isAdmin ? `/admin/academias/${gym.id}/editar` : undefined
						}
					/>
				</li>
			))}
		</ul>
	)
}
```

3c. Atualizar `GymContents` para desestruturar `isAdmin` e repassá-lo ao `ResultsList`:

```tsx
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
```

> O componente exportado `GymResults` já repassa `{...rest}` para `GymContents`, então
> `isAdmin` flui automaticamente — nenhuma outra mudança é necessária ali.

- **Step 4: Rodar e confirmar que passa**

Run: `pnpm --filter frontend test -- src/features/gyms/components/gym-results.test.tsx`
Expected: PASS — os três testes passam.

- **Step 5: Garantir que o teste do `GymCard` continua verde**

Run: `pnpm --filter frontend test -- src/features/gyms/components/gym-card.test.tsx`
Expected: PASS — nenhuma regressão.

- **Step 6: Lint e type-check**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas Biome; zero erros de tipo.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-results.tsx apps/frontend/src/features/gyms/components/gym-results.test.tsx
git commit -m "feat(gym-edit-entrypoint): pass admin edit href per card in GymResults"
```

## Critérios de Sucesso

- `GymResultsProps` expõe `isAdmin?: boolean`.
- Com `isAdmin` verdadeiro: cada card recebe `adminEditHref` no formato
  `/admin/academias/{id}/editar`.
- Com `isAdmin` falso ou omitido: nenhum card recebe `adminEditHref`.
- Teste do `GymCard` permanece verde (sem regressão).
- `lint:fix` e `tsc:check` passam sem problemas.
