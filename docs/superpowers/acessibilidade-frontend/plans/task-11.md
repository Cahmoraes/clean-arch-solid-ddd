# Task 11: `segmented-control` — `aria-label` por item [FR-006]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`SegmentedControl` (`apps/frontend/src/components/ui/segmented-control.tsx`) renderiza um `<fieldset>` com um `<button>` por item de `items: ReadonlyArray<SegmentedItem<T>>`. Hoje o nome acessível de cada botão vem exclusivamente do conteúdo visível de `item.label` (`ReactNode`) — quando `label` é só um ícone (caso de uso real: alternador de visualização cards/lista em `academias/page.tsx`), o botão fica sem nome acessível programático, violando FR-006 (nome acessível em controles ícone-only).

Esta task estende `SegmentedItem<T>` com um campo opcional `ariaLabel?: string` e aplica esse valor como `aria-label` no `<button>` interno quando presente. A mudança é 100% aditiva: os 4 consumidores existentes (`academias/page.tsx`, `check-in-filter-bar.tsx`, `period-selector.tsx`, `user-filter-bar.tsx`) não passam `ariaLabel` hoje e continuam funcionando de forma idêntica — o botão mantém seu nome acessível derivado do texto visível de `label` quando `ariaLabel` está ausente. Esta task é fundação para a task-20 (`academias/page.tsx`), que depende dela para aplicar `ariaLabel: "Ver como cards"` / `ariaLabel: "Ver como lista"` em `VIEW_TOGGLE_ITEMS`.

## Arquivos

- Modify: `apps/frontend/src/components/ui/segmented-control.tsx`
- Test: `apps/frontend/src/components/ui/segmented-control.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: `SegmentedControl` é um componente base de UI reutilizado por 4 consumidores em `apps/frontend/src/components/ui/` — extensão do contrato precisa seguir os padrões de composição já usados nas outras primitivas do design system (props opcionais, sem quebra de API).
- `typescript-advanced`: a mudança é puramente de tipo genérico (`SegmentedItem<T extends string = string>` ganha campo opcional) — precisa preservar a inferência genérica existente e não introduzir variância indevida entre os 4 sites de uso, cada um instanciando `T` diferente (`FilterValue`, `UserFilter`, `PeriodKey`, string literal de view).
- `vercel-composition-patterns`: adicionar uma prop opcional a um item de uma lista renderizada (`items.map`) é uma decisão de API de composição — precisa permanecer aditiva/opt-in, sem forçar os consumidores existentes a mudar.
- `wcag-audit-patterns`: o objetivo direto da task é fechar FR-006 (nome acessível em controle ícone-only) — a implementação de `aria-label` por item e a escolha de não sobrescrever o nome acessível quando ausente seguem o padrão de nome acessível programático já auditado no repositório.
- `test-antipatterns`: o teste novo precisa validar o comportamento real (nome acessível calculado via Testing Library, `getByRole` com `name`) e não a implementação interna (não deve inspecionar `item.ariaLabel` diretamente nem mockar `SegmentedControl`).

## Passos

- **Step 1: Write the failing test**

```tsx
test("aplica aria-label individual no botão quando o item define ariaLabel", () => {
	render(
		<SegmentedControl
			items={[
				{
					value: "cards",
					label: <LayoutGrid data-testid="icon-cards" />,
					ariaLabel: "Ver como cards",
				},
				{ value: "rows", label: "Linhas" },
			]}
			value="cards"
			onValueChange={vi.fn()}
		/>,
	)
	expect(
		screen.getByRole("button", { name: "Ver como cards" }),
	).toBeInTheDocument()
})
```

Adicionar este `test` dentro do `describe("SegmentedControl", ...)` existente em `apps/frontend/src/components/ui/segmented-control.test.tsx`, após o último teste (`"aceita um ReactNode (ícone) como label"`). `LayoutGrid` já está importado no arquivo (`import { LayoutGrid } from "lucide-react"`), nenhum import novo é necessário.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/components/ui/segmented-control.test.tsx` (executar da raiz do monorepo)
Expected: FAIL — o teste novo (`"aplica aria-label individual no botão quando o item define ariaLabel"`) falha com `TestingLibraryElementError: Unable to find an accessible element with the role "button" and name "Ver como cards"`. Os 5 testes já existentes no arquivo continuam passando (6 testes no total, 1 falha).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/components/ui/segmented-control.tsx`, estender a interface `SegmentedItem<T>`:

```tsx
export interface SegmentedItem<T extends string = string> {
	value: T
	label: ReactNode
	count?: number
	ariaLabel?: string
}
```

E aplicar `item.ariaLabel` no `<button>` interno, junto aos atributos já existentes:

```tsx
<button
	key={item.value}
	type="button"
	aria-pressed={active}
	aria-label={item.ariaLabel}
	onClick={() => onValueChange(item.value)}
	className={cn(
		"inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
		active
			? "bg-foreground text-background dark:bg-accent dark:text-accent-foreground"
			: "text-muted-foreground hover:text-foreground",
		countFloat && "relative",
	)}
>
```

Quando `item.ariaLabel` é `undefined` (todos os 4 consumidores atuais), React omite o atributo `aria-label` do DOM e o nome acessível do botão continua computado a partir do conteúdo textual de `item.label`, exatamente como hoje — nenhum teste existente muda de comportamento.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/components/ui/segmented-control.test.tsx` (executar da raiz do monorepo)
Expected: PASS — 6 testes passam (os 5 existentes + o novo `"aplica aria-label individual no botão quando o item define ariaLabel"`).

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/frontend/src/components/ui/segmented-control.tsx apps/frontend/src/components/ui/segmented-control.test.tsx
git commit -m "feat(a11y): adiciona aria-label opcional por item no SegmentedControl"
```

## Critérios de Sucesso

- `SegmentedItem<T>` em `apps/frontend/src/components/ui/segmented-control.tsx` expõe o campo opcional `ariaLabel?: string`, sem alterar `value`, `label` ou `count`.
- Quando `item.ariaLabel` está definido, o `<button>` correspondente renderizado por `SegmentedControl` expõe esse valor como nome acessível programático (`aria-label`), verificável via `screen.getByRole("button", { name: item.ariaLabel })` — fecha FR-006 para itens cujo `label` visível é só um ícone.
- Quando `item.ariaLabel` está ausente, o comportamento é idêntico ao atual: o nome acessível do botão continua vindo do texto visível de `item.label`, sem regressão — os testes existentes (`"marca o item selecionado com aria-pressed"`, `"dispara onValueChange ao clicar em outro item"`, `"exibe o contador quando fornecido"`, `"expõe o nome acessível via aria-label"` do `fieldset`, `"aceita um ReactNode (ícone) como label"`) continuam passando sem modificação.
- A mudança é 100% aditiva/opcional: os 4 consumidores existentes de `SegmentedControl`/`SegmentedItem` (`apps/frontend/src/app/(authenticated)/academias/page.tsx`, `apps/frontend/src/features/check-ins/components/check-in-filter-bar.tsx`, `apps/frontend/src/features/admin/analytics/components/period-selector.tsx`, `apps/frontend/src/features/admin/components/user-filter-bar.tsx`) não passam `ariaLabel` e continuam compilando e funcionando sem qualquer alteração de código.
- `pnpm --filter frontend exec vitest run src/components/ui/segmented-control.test.tsx` roda 6 testes, todos com status PASS.
