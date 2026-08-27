# Task 20: `academias/page` — `aria-label` por item no toggle de visualização [FR-006]

**Status:** DONE
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** task-11

## Visão Geral

O toggle de visualização "cards"/"lista" em `academias/page.tsx` é renderizado via `SegmentedControl`, cujos itens (`VIEW_TOGGLE_ITEMS`) usam os ícones `LayoutGrid`/`List` — já `aria-hidden="true"` — como único conteúdo visual de cada botão. O `<fieldset>` externo já expõe `aria-label="Alternar visualização"` (o nome do grupo), mas cada `<button>` individual não tem nome acessível próprio: um usuário de leitor de tela navegando pelos dois botões do grupo os ouve sem diferenciação. A task-11 estende `SegmentedItem<T>` com um campo opcional `ariaLabel?: string`, aplicado pelo `SegmentedControl` como `aria-label` no `<button>` interno quando presente. Esta task consome esse contrato: adiciona `ariaLabel: "Ver como cards"` ao item `value: "cards"` e `ariaLabel: "Ver como lista"` ao item `value: "rows"` em `VIEW_TOGGLE_ITEMS`, dando nome acessível individual aos dois botões do toggle.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/academias/page.test.tsx`

### Conformidade com as Skills Padrão

- `wcag-audit-patterns`: a mudança é exatamente nome acessível por controle ícone-only dentro de um grupo (critério 4.1.2 Name, Role, Value / 1.1.1 Non-text Content) — o domínio central desta task.
- `vercel-react-best-practices`: a task edita um array de configuração (`VIEW_TOGGLE_ITEMS`) consumido por um componente React de UI (`SegmentedControl`) dentro de uma página App Router — garante que o ajuste segue os padrões de composição/dados já usados no arquivo, sem introduzir re-renders ou estado desnecessário.
- `test-antipatterns`: o teste novo deve validar o nome acessível real via `getByRole("button", { name })` (comportamento observável pelo usuário/leitor de tela), não implementação interna (ex.: inspecionar a prop `ariaLabel` do objeto de configuração diretamente).

## Passos

- **Step 1: Write the failing test**

Adicionar ao `describe("AcademiasPage", ...)` existente em `apps/frontend/src/app/(authenticated)/academias/page.test.tsx` (mesmo arquivo, mesmo padrão de `renderWithProviders` já usado nos outros testes do bloco):

```tsx
test("toggle de visualização expõe aria-label acessível por item [FR-006]", () => {
	renderWithProviders(<AcademiasPage />)

	expect(
		screen.getByRole("button", { name: "Ver como cards" }),
	).toBeInTheDocument()
	expect(
		screen.getByRole("button", { name: "Ver como lista" }),
	).toBeInTheDocument()
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/academias/page.test.tsx" -t "toggle de visualização expõe aria-label acessível por item"`
Expected: FAIL — `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Ver como cards"` (os botões do toggle hoje só têm `aria-pressed`, sem `aria-label` individual).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/app/(authenticated)/academias/page.tsx`, adicionar o campo `ariaLabel` a cada item de `VIEW_TOGGLE_ITEMS` (consome o campo opcional `ariaLabel?: string` de `SegmentedItem<T>` já estendido pela task-11):

```tsx
const VIEW_TOGGLE_ITEMS = [
	{
		value: "cards" as GymView,
		ariaLabel: "Ver como cards",
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
		ariaLabel: "Ver como lista",
		label: (
			<List
				data-testid="view-toggle-rows"
				className="h-4 w-4"
				aria-hidden="true"
			/>
		),
	},
]
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/academias/page.test.tsx" -t "toggle de visualização expõe aria-label acessível por item"`
Expected: PASS

- **Step 5: Commit** *(execução paralela — esta task é uma de várias implementadas na mesma wave/árvore. Não commitar; reportar apenas os arquivos alterados. O orquestrador commita no barrier de integração.)*

## Critérios de Sucesso

- O botão do item `value: "cards"` em `VIEW_TOGGLE_ITEMS` é localizável via `screen.getByRole("button", { name: "Ver como cards" })`.
- O botão do item `value: "rows"` em `VIEW_TOGGLE_ITEMS` é localizável via `screen.getByRole("button", { name: "Ver como lista" })`.
- O `<fieldset>` externo continua expondo `aria-label="Alternar visualização"` (nome do grupo) sem alteração — os dois níveis (grupo + item) coexistem, satisfazendo FR-006 tanto para o grupo quanto para os controles individuais dentro dele.
- Nenhum outro consumidor de `SegmentedControl` (`check-in-filter-bar.tsx`, `admin/analytics/period-selector.tsx`, `admin/user-filter-bar.tsx`) é alterado por esta task.
</content>
