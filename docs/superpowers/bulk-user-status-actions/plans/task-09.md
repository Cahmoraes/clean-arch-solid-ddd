# Task 9: BulkActionBar — barra de ações fixa no rodapé [FR-004]

**Status:** IN_PROGRESS
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`BulkActionBar` é um novo componente de apresentação (sem estado próprio, sem chamadas de
API) que exibe a contagem de usuários selecionados e três ações — "Ativar", "Desativar",
"Limpar seleção" — quando há 1 ou mais usuários selecionados na listagem
`/admin/usuarios`. Quando `selectedCount` é `0`, o componente não renderiza nada (`null`),
para não ocupar espaço nem poluir o DOM enquanto não há seleção. A integração real com
`AdminUsersContent` (conectar os callbacks a `selectedIds`, abrir o diálogo de confirmação,
disparar a mutation) é feita na Task 12 — esta task entrega o componente isolado, testável
por `render()` direto, sem depender de `page.tsx`, `AdminUsersContent`, do hook de mutation
(Task 11) ou do diálogo (Task 10).

## Arquivos

- Create: `apps/frontend/src/features/admin/components/bulk-action-bar.tsx`
- Create: `apps/frontend/src/features/admin/components/bulk-action-bar.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: os botões da barra reaproveitam o primitivo `Button` já existente em `@/components/ui/button` (variantes `outline`/`ghost`), sem criar um novo primitivo de botão.
- `tailwindcss`: aplicar exatamente os tokens do mockup — `border-border`, `bg-card`, `rounded-md` (mapeado para `--radius-md: 14px` no `@theme` de `globals.css`), cadência de espaçamento `gap-2`/`gap-3`/`px-5`/`py-4` já usada em `UserRow`/`ErrorState` — sem introduzir novos valores.
- `ui-ux-pro-max`: usada para validar visualmente (via a integração shadcn/ui MCP disponível no repo) que a barra sticky segue a hierarquia do mockup antes de finalizar o componente.
- `vercel-composition-patterns`: `BulkActionBar` é puramente controlado por props (`selectedCount`, `onActivate`, `onDeactivate`, `onClear`) — nenhuma lógica de seleção ou de mutation vive aqui, mantendo o componente reutilizável e fácil de testar isoladamente.
- `vercel-react-best-practices`: o retorno antecipado `if (selectedCount === 0) return null` evita renderizar uma barra vazia/inativa, seguindo o mesmo padrão condicional já usado em `NumberedPagination` (`totalPages > 1 ? ... : null`) em `page.tsx`.
- `vitest`: os 3 testes seguem a convenção `describe`/`it` já usada em outros componentes de `src/components/ui` (ex.: `empty-state.test.tsx`).
- `test-antipatterns`: os testes usam `screen.getByRole("button", { name: ... })` e `userEvent.click` sobre os elementos reais, nunca invocando os callbacks diretamente ou inspecionando props internas do componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/bulk-user-status-actions-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (HTML gerado a partir dos tokens do projeto, sem Figma/wireframe externo).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela, além do mockup curado? Se não houver resposta, prosseguir com o mockup como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `shadcn` (componentes shadcn/ui) e skill `ui-ux-pro-max` (com integração shadcn/ui MCP) — nenhuma ferramenta de design-to-code externa configurada neste repo.
- **Decisões visuais já tomadas (não refazer):** barra ancorada ao rodapé da lista (`position: sticky; bottom`), visível apenas com 1+ selecionados; contagem de selecionados + botões "Ativar" / "Desativar" / "Limpar seleção"; tokens de cor `--success #2fcf80` / `--warning #ffb443` para os botões Ativar/Desativar (mesmo padrão já usado em `more-actions-menu.tsx`: `text-success`/`text-warning`); `--border #2a2a2a` para a borda da barra; radius `--radius-md (14px)` para a barra e `--radius-sm (8px)` para os botões (já herdado do `Button` padrão); espaçamento `gap-2`/`gap-3`/`px-5`/`py-4`, consistente com `UserRow`.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade
Visual` acima (decididas em tempo de plano). Confirmar com o usuário se existe uma fonte
de design original além do mockup curado — na ausência de resposta, ou se a resposta for
"não", seguir apenas o mockup em
`../specs/mockups/bulk-user-status-actions-visual.md` como norte de layout/tokens (não
redeterminar espaçamento/cores a partir do zero). Não há ferramenta de design-to-code
externa configurada neste repo; usar as skills `shadcn` e `ui-ux-pro-max` já identificadas
para a implementação manual do componente, reaproveitando o primitivo `Button` existente.

- **Step 1: Escrever o teste falho — não renderiza nada quando selectedCount é 0**

Criar `apps/frontend/src/features/admin/components/bulk-action-bar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { BulkActionBar } from "./bulk-action-bar"

describe("BulkActionBar", () => {
	test("não renderiza nada quando selectedCount é 0", () => {
		const { container } = render(
			<BulkActionBar
				selectedCount={0}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(container).toBeEmptyDOMElement()
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "não renderiza nada quando selectedCount é 0"`
Expected: FAIL — o módulo `./bulk-action-bar` ainda não existe (`Cannot find module`).

- **Step 3: Implementação mínima — componente com early return**

Criar `apps/frontend/src/features/admin/components/bulk-action-bar.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

export interface BulkActionBarProps {
	selectedCount: number
	onActivate: () => void
	onDeactivate: () => void
	onClear: () => void
	className?: string
}

function selectionLabel(count: number): string {
	return `${count} ${count === 1 ? "selecionado" : "selecionados"}`
}

export function BulkActionBar({
	selectedCount,
	onActivate,
	onDeactivate,
	onClear,
	className,
}: BulkActionBarProps) {
	if (selectedCount === 0) return null

	return (
		<div
			data-testid="bulk-action-bar"
			className={cn(
				"sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-5 py-4 shadow-lg",
				className,
			)}
		>
			<span className="text-sm font-medium text-card-foreground">
				{selectionLabel(selectedCount)}
			</span>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-success hover:bg-success-soft hover:text-success"
					onClick={onActivate}
				>
					Ativar
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-warning hover:bg-warning-soft hover:text-warning"
					onClick={onDeactivate}
				>
					Desativar
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onClear}>
					Limpar seleção
				</Button>
			</div>
		</div>
	)
}
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "não renderiza nada quando selectedCount é 0"`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/admin/components/bulk-action-bar.tsx apps/frontend/src/features/admin/components/bulk-action-bar.test.tsx
git commit -m "feat: cria o componente BulkActionBar"
```

- **Step 6: Escrever o teste falho — renderiza contagem e os 3 botões**

Adicionar ao mesmo `describe`:

```tsx
	test("renderiza a contagem e os 3 botões quando selectedCount é maior que 0", () => {
		render(
			<BulkActionBar
				selectedCount={3}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(screen.getByText("3 selecionados")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Ativar" })).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Desativar" }),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Limpar seleção" }),
		).toBeInTheDocument()
	})

	test("usa o singular 'selecionado' quando selectedCount é 1", () => {
		render(
			<BulkActionBar
				selectedCount={1}
				onActivate={vi.fn()}
				onDeactivate={vi.fn()}
				onClear={vi.fn()}
			/>,
		)

		expect(screen.getByText("1 selecionado")).toBeInTheDocument()
	})
```

- **Step 7: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "renderiza a contagem e os 3 botões"`
Expected: PASS — nenhuma mudança de implementação necessária além do Step 3.

- **Step 8: Escrever o teste falho — cada botão chama seu callback ao clicar**

Adicionar ao mesmo `describe`:

```tsx
	test("cada botão chama seu respectivo callback ao clicar", async () => {
		const user = userEvent.setup()
		const onActivate = vi.fn()
		const onDeactivate = vi.fn()
		const onClear = vi.fn()

		render(
			<BulkActionBar
				selectedCount={2}
				onActivate={onActivate}
				onDeactivate={onDeactivate}
				onClear={onClear}
			/>,
		)

		await user.click(screen.getByRole("button", { name: "Ativar" }))
		expect(onActivate).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Desativar" }))
		expect(onDeactivate).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Limpar seleção" }))
		expect(onClear).toHaveBeenCalledTimes(1)
	})
```

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "cada botão chama seu respectivo callback ao clicar"`
Expected: PASS

- **Step 10: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 11: Commit final**

```bash
git add apps/frontend/src/features/admin/components/bulk-action-bar.tsx apps/frontend/src/features/admin/components/bulk-action-bar.test.tsx
git commit -m "test: cobre contagem, singular/plural e callbacks do BulkActionBar"
```

## Critérios de Sucesso

- `BulkActionBar` retorna `null` (não renderiza nenhum elemento) quando `selectedCount` é
  `0` (FR-004).
- Com `selectedCount > 0`, renderiza a contagem (com singular "selecionado"/plural
  "selecionados" corretos) e os três botões "Ativar", "Desativar" e "Limpar seleção".
- Cada botão chama exatamente o callback correspondente (`onActivate`, `onDeactivate`,
  `onClear`) ao ser clicado, sem side-effects cruzados.
- O componente não depende de `page.tsx`, do hook de mutation (Task 11) ou do diálogo de
  confirmação (Task 10) — é testável isoladamente via `render()` direto.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e
  `pnpm --filter frontend lint:fix` passam sem erros.
