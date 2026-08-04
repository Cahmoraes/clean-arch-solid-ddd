# Task 10: BulkStatusConfirmationDialog — diálogo de confirmação [FR-005]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`BulkStatusConfirmationDialog` é o diálogo de confirmação exibido antes de executar uma
ação em massa (ativar ou desativar) sobre os usuários selecionados em
`/admin/usuarios`. Segue o mesmo padrão visual e estrutural dos diálogos de confirmação já
existentes em `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`
(por exemplo `SuspendConfirmationDialog`), reaproveitando os primitivos `AlertDialog*` de
`@/components/ui/alert-dialog` e o `Button` de `@/components/ui/button` — mas é
parametrizado por uma prop `action: "activate" | "deactivate"`, que decide o título, a
descrição e o rótulo do botão de confirmação, e por `count` (a contagem de usuários
selecionados), que é interpolada no texto de confirmação. Este componente não conhece
`selectedIds`, o hook de mutation ou `AdminUsersContent` — é puramente controlado por
props (`open`, `onOpenChange`, `action`, `count`, `isPending`, `onConfirm`), testável
isoladamente. A integração real (abrir com a ação certa, disparar a mutation ao confirmar)
é feita na Task 12.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx`
- Create: `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: reaproveita os primitivos `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction` já gerados em `@/components/ui/alert-dialog`, sem criar um novo wrapper Radix.
- `tailwindcss`: o botão de confirmação usa as mesmas classes de variante (`variant="destructive"` para desativar, seguindo o mesmo padrão de `SuspendConfirmationDialog`; cor de destaque `--success`/`bg-accent` para ativar, seguindo `PromoteConfirmationDialog`) já presentes em `confirmation-dialogs.tsx`, sem introduzir novos tokens.
- `ui-ux-pro-max`: usada para validar visualmente a hierarquia título/descrição/botões contra o mockup antes de finalizar o componente.
- `vercel-composition-patterns`: o componente é parametrizado por `action` em vez de duplicar dois componentes quase idênticos (`ActivateConfirmationDialog`/`DeactivateConfirmationDialog`) — um único componente com uma pequena tabela de conteúdo por ação, no mesmo espírito de `UsersContent` decidir o que renderizar por estado.
- `vercel-react-best-practices`: os textos condicionais por `action` são resolvidos por uma função pura (`resolveDialogContent(action, count)`), fora do JSX, mantendo o `return` do componente legível.
- `vitest`: os 3 testes seguem a convenção `describe`/`test` em português já usada nos demais testes de componentes do diretório `user-detail`.
- `test-antipatterns`: os testes usam `screen.getByRole("alertdialog")`/`getByRole("button", ...)` sobre o DOM real renderizado pelo Radix (via portal), nunca inspecionando props internas do componente.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/bulk-user-status-actions-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion (HTML gerado a partir dos tokens do projeto, sem Figma/wireframe externo).
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela, além do mockup curado? Se não houver resposta, prosseguir com o mockup como norte.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** skill `shadcn` (componentes shadcn/ui) e skill `ui-ux-pro-max` (com integração shadcn/ui MCP) — nenhuma ferramenta de design-to-code externa configurada neste repo.
- **Decisões visuais já tomadas (não refazer):** o diálogo reaproveita o MESMO padrão visual dos diálogos de confirmação existentes (`SuspendConfirmationDialog`/`PromoteConfirmationDialog` em `confirmation-dialogs.tsx`) — `AlertDialogContent` com `rounded-xl border border-border bg-card p-6`; título/descrição em `AlertDialogHeader`; botões em `AlertDialogFooter` (`Cancelar` + ação de confirmação); nenhuma variação de layout nova é introduzida, apenas o texto muda conforme `action`.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler a fonte de design e as ferramentas de fidelidade já registradas em `### Fidelidade
Visual` acima (decididas em tempo de plano). Confirmar com o usuário se existe uma fonte
de design original além do mockup curado — na ausência de resposta, ou se a resposta for
"não", seguir apenas o mockup em
`../specs/mockups/bulk-user-status-actions-visual.md` como norte de layout/tokens, e
reaproveitar o padrão visual já existente em `confirmation-dialogs.tsx` (não redesenhar o
diálogo do zero). Não há ferramenta de design-to-code externa configurada neste repo; usar
as skills `shadcn` e `ui-ux-pro-max` já identificadas para validar a implementação manual.

- **Step 1: Escrever o teste falho — título e descrição corretos para "activate"**

Criar `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { BulkStatusConfirmationDialog } from "./bulk-status-confirmation-dialog"

describe("BulkStatusConfirmationDialog", () => {
	test("renderiza título e descrição de ativação quando action é 'activate'", () => {
		render(
			<BulkStatusConfirmationDialog
				open
				action="activate"
				count={3}
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar ativação em massa" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Tem certeza que deseja ativar 3 usuários selecionados? Eles voltarão a ter acesso aos recursos protegidos.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar ativação" }),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter frontend test -- -t "renderiza título e descrição de ativação"`
Expected: FAIL — o módulo `./bulk-status-confirmation-dialog` ainda não existe (`Cannot
find module`).

- **Step 3: Implementação mínima — componente parametrizado por action**

Criar `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx`:

```tsx
"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export type BulkStatusAction = "activate" | "deactivate"

export interface BulkStatusConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	action: BulkStatusAction
	count: number
	isPending: boolean
	onConfirm: () => void
}

function pluralUsers(count: number): string {
	return count === 1 ? "1 usuário selecionado" : `${count} usuários selecionados`
}

interface DialogContent {
	title: string
	description: string
	confirmLabel: string
	pendingLabel: string
}

function resolveDialogContent(
	action: BulkStatusAction,
	count: number,
): DialogContent {
	if (action === "activate") {
		return {
			title: "Confirmar ativação em massa",
			description: `Tem certeza que deseja ativar ${pluralUsers(count)}? Eles voltarão a ter acesso aos recursos protegidos.`,
			confirmLabel: "Confirmar ativação",
			pendingLabel: "Ativando...",
		}
	}
	return {
		title: "Confirmar desativação em massa",
		description: `Tem certeza que deseja desativar ${pluralUsers(count)}? Eles perderão o acesso aos recursos protegidos até serem reativados.`,
		confirmLabel: "Confirmar desativação",
		pendingLabel: "Desativando...",
	}
}

export function BulkStatusConfirmationDialog({
	open,
	onOpenChange,
	action,
	count,
	isPending,
	onConfirm,
}: BulkStatusConfirmationDialogProps) {
	const content = resolveDialogContent(action, count)

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{content.title}</AlertDialogTitle>
					<AlertDialogDescription>{content.description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant={action === "deactivate" ? "destructive" : "primary"}
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPending}
						>
							{isPending ? content.pendingLabel : content.confirmLabel}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "renderiza título e descrição de ativação"`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx
git commit -m "feat: cria o componente BulkStatusConfirmationDialog"
```

- **Step 6: Escrever o teste falho — título e descrição corretos para "deactivate"**

Adicionar ao mesmo `describe`:

```tsx
	test("renderiza título e descrição de desativação quando action é 'deactivate'", () => {
		render(
			<BulkStatusConfirmationDialog
				open
				action="deactivate"
				count={1}
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar desativação em massa" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Tem certeza que deseja desativar 1 usuário selecionado? Eles perderão o acesso aos recursos protegidos até serem reativados.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar desativação" }),
		).toBeInTheDocument()
	})
```

- **Step 7: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "renderiza título e descrição de desativação"`
Expected: PASS — nenhuma mudança de implementação necessária além do Step 3;
`resolveDialogContent`/`pluralUsers` já cobrem os dois ramos e o caso singular.

- **Step 8: Escrever o teste falho — onConfirm é chamado e onOpenChange respeita o cancelar**

Adicionar ao mesmo `describe`:

```tsx
	test("onConfirm é chamado ao confirmar e onOpenChange(false) é chamado ao cancelar", async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const onOpenChange = vi.fn()

		render(
			<BulkStatusConfirmationDialog
				open
				action="activate"
				count={2}
				isPending={false}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
			/>,
		)

		await user.click(screen.getByRole("button", { name: "Confirmar ativação" }))
		expect(onConfirm).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Cancelar" }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
```

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter frontend test -- -t "onConfirm é chamado ao confirmar e onOpenChange"`
Expected: PASS — `AlertDialogAction` já dispara `onClick={onConfirm}` (Step 3), e
`AlertDialogCancel` (primitivo Radix) já chama `onOpenChange(false)` no `AlertDialog` pai
automaticamente ao fechar, sem código adicional necessário.

- **Step 10: Rodar a suíte completa de frontend, lint e type-check**

Run: `pnpm --filter frontend test -- --run`
Expected: PASS

Run: `pnpm --filter frontend tsc:check`
Expected: sem erros de tipo

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas reportados pelo Biome

- **Step 11: Commit final**

```bash
git add apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.test.tsx
git commit -m "test: cobre desativação, confirmação e cancelamento do BulkStatusConfirmationDialog"
```

## Critérios de Sucesso

- `BulkStatusConfirmationDialog` exibe título, descrição e rótulo de botão corretos para
  `action === "activate"` e para `action === "deactivate"`, ambos mencionando `count` no
  texto (com singular/plural corretos) (FR-005).
- Clicar no botão de confirmação chama `onConfirm` exatamente uma vez.
- Clicar em "Cancelar" resulta em `onOpenChange` sendo chamado com `false`.
- O componente é parametrizado por props e não depende de `selectedIds`, do hook de
  mutation (Task 11) ou de `AdminUsersContent` — testável isoladamente via `render()`
  direto.
- `pnpm --filter frontend test -- --run`, `pnpm --filter frontend tsc:check` e
  `pnpm --filter frontend lint:fix` passam sem erros.
