# Task 7: Trigger "Mais ações" ícone-só + tooltip [FR-002, FR-007, FR-008]

**Status:** IN_PROGRESS
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** task-01, task-02, task-03

## Visão Geral

Converter o trigger "Mais ações" de `more-actions-menu.tsx` (hoje texto + `ChevronDown`) em botão ícone-só com `aria-label` e `Tooltip` (FR-002), garantindo que os itens internos do dropdown continuem exatamente como estão (FR-007 — restrição de não-mudança verificável só aqui, o único ponto de código real adjacente a essa garantia) e que o padrão aria-label+tooltip (FR-008) seja coberto nesta superfície.

**Nota importante de infraestrutura de teste (mesma descoberta da task 6):** o Radix `Tooltip.Root` lança erro em runtime sem um `TooltipProvider` ancestral. O arquivo de teste atual usa `render()` puro de `@testing-library/react`. Esta task troca todas as chamadas de `render(` por `renderWithProviders(` (import de `@/test/render`) neste arquivo, não só nos testes novos — a partir desta task qualquer render de `MoreActionsMenu` com itens presentes monta um `Tooltip.Root`.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: composição de três compound components empilhados (`Tooltip` + `DropdownMenu` + `Button`).
- `vercel-composition-patterns`: aninhamento correto de múltiplos `asChild`/`Slot` sem quebrar o comportamento de clique.
- `tailwindcss`: ajuste de espaçamento/alinhamento do trigger sem `ChevronDown`.
- `test-antipatterns`: query por role/aria-label, preservando as asserções de texto dos itens internos sem reescrevê-las.
- `impeccable`: acessibilidade do trigger ícone-só, mesmo racional da task 6.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-semantic-icons-visual.md`
- **Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** ícone `MoreHorizontal` (via `ACTION_ICON.moreActions`) substitui o texto "Mais ações" + `ChevronDown`; `aria-label="Mais ações"`; texto do tooltip "Mais ações". Os itens internos do dropdown (`AdminSection`/`StatusSection`/`DeleteSection`) e suas cores (`text-warning`/`text-success`/`text-destructive`) não mudam.

## Passos

- **Step 1: Write the failing test**

Substituir o conteúdo de `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx` por:

```tsx
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import type { MoreActionsMenuProps } from "./more-actions-menu"
import { MoreActionsMenu } from "./more-actions-menu"

function basePermissions(): MoreActionsMenuProps["permissions"] {
	return {
		canActivate: false,
		canSuspend: true,
		canPromoteToAdmin: true,
		canDemoteFromAdmin: false,
		canDelete: true,
		isLocked: false,
		canEditProfile: true,
		canChangeStatus: true,
		canChangeRole: false,
	}
}

function baseFlags(): MoreActionsMenuProps["flags"] {
	return {
		isPending: false,
		isActivating: false,
		isSuspending: false,
		isPromoting: false,
		isDemoting: false,
		isDeleting: false,
	}
}

function baseHandlers() {
	return {
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}

type UserInstance = ReturnType<typeof userEvent.setup>

async function openMenu(user: UserInstance) {
	await user.click(screen.getByRole("button", { name: /mais ações/i }))
}

describe("MoreActionsMenu", () => {
	test("renderiza o trigger 'Mais ações'", () => {
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("exibe 'Tornar Admin' quando canPromoteToAdmin = true e abre dialog ao clicar", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /tornar admin/i })
		expect(item).toBeInTheDocument()
		await user.click(item)
		expect(handlers.onOpenPromote).toHaveBeenCalledTimes(1)
	})

	test("exibe 'Remover Admin' quando canDemoteFromAdmin = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: true,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.getByRole("menuitem", { name: /remover admin/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /tornar admin/i }),
		).not.toBeInTheDocument()
	})

	test("exibe 'Inativar' em cor warning quando canSuspend = true", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /inativar/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-warning")
	})

	test("chama onOpenSuspend ao clicar em Inativar (não executa diretamente)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /inativar/i }))
		expect(handlers.onOpenSuspend).toHaveBeenCalledTimes(1)
		expect(handlers.onActivate).not.toHaveBeenCalled()
	})

	test("exibe 'Ativar' em cor success quando canActivate = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: false,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /^ativar$/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-success")
	})

	test("exibe 'Desbloquear' quando canActivate = true e isLocked = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: true,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.getByRole("menuitem", { name: /desbloquear/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /^ativar$/i }),
		).not.toBeInTheDocument()
	})

	test("chama onActivate diretamente (sem dialog) ao clicar em Ativar", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /^ativar$/i }))
		expect(handlers.onActivate).toHaveBeenCalledTimes(1)
		expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
	})

	test("chama onActivate diretamente ao clicar em Desbloquear (FR-016)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: true,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /desbloquear/i }))
		expect(handlers.onActivate).toHaveBeenCalledTimes(1)
		expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
	})

	test("exibe 'Excluir' em cor destructive quando canDelete = true", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /excluir/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-destructive")
	})

	test("chama onOpenDelete ao clicar em Excluir (não executa diretamente)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /excluir/i }))
		expect(handlers.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("não exibe 'Excluir' quando canDelete = false", async () => {
		const user = userEvent.setup()
		const permissions = { ...basePermissions(), canDelete: false }
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.queryByRole("menuitem", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("não exibe separador quando grupo acima está vazio (sem Tornar/Remover Admin)", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: false,
			canSuspend: true,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const separators = document.querySelectorAll('[role="separator"]')
		expect(separators).toHaveLength(1)
	})

	test("exibe separador entre grupo admin e excluir quando grupo status está vazio", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: true,
			canSuspend: false,
			canActivate: false,
			canDelete: true,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const separators = document.querySelectorAll('[role="separator"]')
		expect(separators).toHaveLength(1)
	})

	test("não renderiza nada quando todas as permissões estão negadas", () => {
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: false,
			canSuspend: false,
			canActivate: false,
			canDelete: false,
		}
		renderWithProviders(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		expect(
			screen.queryByRole("button", { name: /mais ações/i }),
		).not.toBeInTheDocument()
	})

	test("desabilita o trigger quando isPending = true", () => {
		const flags = { ...baseFlags(), isPending: true }
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={flags}
				{...baseHandlers()}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeDisabled()
	})

	test("FR-002: o trigger não exibe texto visível, só aria-label", () => {
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		const btn = screen.getByRole("button", { name: /mais ações/i })
		expect(within(btn).queryByText("Mais ações")).not.toBeInTheDocument()
		expect(btn).toHaveAttribute("aria-label", "Mais ações")
	})

	test("FR-007: itens internos do menu permanecem com texto inalterado", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.getByRole("menuitem", { name: /tornar admin/i }),
		).toHaveTextContent("Tornar Admin")
		expect(
			screen.getByRole("menuitem", { name: /inativar/i }),
		).toHaveTextContent("Inativar")
		expect(
			screen.getByRole("menuitem", { name: /excluir/i }),
		).toHaveTextContent("Excluir")
	})

	test("FR-008: exibe tooltip 'Mais ações' no hover/foco e o clique ainda abre o menu", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		const btn = screen.getByRole("button", { name: /mais ações/i })

		await user.hover(btn)
		expect(await screen.findByText("Mais ações")).toBeInTheDocument()
		await user.unhover(btn)

		btn.focus()
		expect(await screen.findByText("Mais ações")).toBeInTheDocument()

		await user.click(btn)
		expect(
			screen.getByRole("menuitem", { name: /tornar admin/i }),
		).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/more-actions-menu.test.tsx`
Expected: FAIL no teste "FR-002: o trigger não exibe texto visível, só aria-label" — o trigger atual renderiza "Mais ações" como texto visível (`within(btn).queryByText("Mais ações")` encontra o nó) e não tem `aria-label`. Os demais testes (pré-existentes, agora usando `renderWithProviders`, e o novo "FR-007") continuam passando sem alteração de comportamento, já que os itens internos e a query por `getByRole("button", { name: /mais ações/i })` ainda funcionam via texto visível neste estado intermediário.

- **Step 3: Write minimal implementation**

Editar `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx`. Remover o import `import { ChevronDown } from "lucide-react"` e adicionar:

```tsx
import { ACTION_ICON } from "@/components/ui/status-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
```

Adicionar, junto às demais constantes de módulo (antes de `groupPresence` ou depois — junto ao topo do arquivo, após os imports):

```tsx
const MoreActionsIcon = ACTION_ICON.moreActions
```

Substituir o `return` de `MoreActionsMenu` (a partir de `if (!hasItems) return null`, mantendo essa linha) por:

```tsx
	if (!hasItems) return null

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							aria-label="Mais ações"
							disabled={
								flags.isPending ||
								flags.isActivating ||
								flags.isSuspending ||
								flags.isPromoting ||
								flags.isDemoting ||
								flags.isDeleting
							}
						>
							<MoreActionsIcon className="h-4 w-4" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent>Mais ações</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="start">
				<AdminSection
					permissions={permissions}
					flags={flags}
					onOpenPromote={onOpenPromote}
					onOpenDemote={onOpenDemote}
				/>
				{g1 && g2 && <DropdownMenuSeparator />}
				<StatusSection
					permissions={permissions}
					flags={flags}
					onActivate={onActivate}
					onOpenSuspend={onOpenSuspend}
				/>
				{(g1 || g2) && g3 && <DropdownMenuSeparator />}
				<DeleteSection
					permissions={permissions}
					flags={flags}
					onOpenDelete={onOpenDelete}
				/>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
```

Nenhuma linha dentro de `AdminSection`, `StatusSection` ou `DeleteSection` é tocada (FR-007).

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/more-actions-menu.test.tsx`
Expected: PASS (todos os 19 testes do arquivo)

- **Step 5: Commit** *(esta task participa da Wave 3 em paralelo com as tasks 5, 6 e 8, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx
git commit -m "feat: trigger Mais acoes vira icone-so com aria-label e tooltip (FR-002, FR-007, FR-008)"
```

## Critérios de Sucesso

- O trigger "Mais ações" não exibe texto visível; carrega `aria-label="Mais ações"` e ícone `MoreHorizontal` (via `ACTION_ICON.moreActions`), sem `ChevronDown`.
- O tooltip "Mais ações" aparece tanto no hover do mouse quanto no foco de teclado do trigger, e o clique no trigger continua abrindo o `DropdownMenuContent`.
- Nenhuma linha dentro de `<DropdownMenuContent>` (itens internos, textos, cores) foi alterada.
- Todos os testes de `more-actions-menu.test.tsx` (pré-existentes e novos) passam usando `renderWithProviders`.
