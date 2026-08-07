# Task 6: Botão "Editar dados" ícone-só + tooltip [FR-001, FR-008]

**Status:** IN_PROGRESS
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** standard
**Depends on:** task-01, task-02, task-03

## Visão Geral

Converter o botão "Editar dados" de `user-actions-footer.tsx` (hoje texto puro) em botão ícone-só com `aria-label` e `Tooltip` (FR-001), garantindo que o padrão "todo botão ícone-só tem aria-label E tooltip" (FR-008) seja verificado nesta mesma superfície — não há como testar FR-008 "no vazio", ele só existe atrelado a um botão real, e este é o primeiro botão ícone-só desta feature.

**Nota importante de infraestrutura de teste:** o Radix `Tooltip.Root` lança erro em runtime se renderizado sem um `TooltipProvider` ancestral (não há `defaultContext` — confirmado lendo `@radix-ui/react-context`). O arquivo de teste atual usa `render()` puro de `@testing-library/react`, que **não** passa pelo wrapper `renderWithProviders` (o único que a task 3 envolveu com `TooltipProvider`). Por isso esta task troca todas as chamadas de `render(` por `renderWithProviders(` (import de `@/test/render`) neste arquivo de teste — não só nos 2 testes novos, mas em todos os existentes, porque a partir desta task **qualquer** render de `UserActionsFooter` com `canEdit=true` passa a montar um `Tooltip.Root` e quebraria sem o provider.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: composição `Button size="icon"` + `Tooltip`.
- `vercel-composition-patterns`: aninhamento correto de `TooltipTrigger asChild` sobre `Button`.
- `tailwindcss`: nenhuma classe nova crítica, mas ajuste de espaçamento no footer se necessário.
- `test-antipatterns`: query por `aria-label`/role em vez de texto, evitando asserções frágeis.
- `impeccable`: acessibilidade de botão ícone-só (foco visível, aria-label, tooltip) é o núcleo da Característica Arquitetural "Acessibilidade" priorizada na spec.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/admin-semantic-icons-visual.md`
- **Fonte de design original:** nenhuma — layout definido via mockup do companion de brainstorming, aprovado interativamente pelo usuário.
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup curado.
- **Decisões visuais já tomadas (não refazer):** ícone `Pencil` (via `ACTION_ICON.edit`), `aria-label="Editar dados"`, texto do tooltip "Editar dados". A cor de fundo (`bg-accent`/`text-accent-foreground`/`hover:bg-accent/90`) do botão original é preservada — só o texto visível é removido em favor do ícone.

## Passos

- **Step 1: Write the failing test**

Substituir o conteúdo de `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx` por:

```tsx
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { renderWithProviders } from "@/test/render"
import { UserActionsFooter } from "./user-actions-footer"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function baseProps() {
	return {
		user: buildUser(),
		permissions: {
			canActivate: false,
			canSuspend: true,
			canPromoteToAdmin: true,
			canDemoteFromAdmin: false,
			canDelete: true,
			isLocked: false,
			canEditProfile: true,
			canChangeStatus: true,
			canChangeRole: false,
		},
		flags: {
			isPending: false,
			isActivating: false,
			isSuspending: false,
			isPromoting: false,
			isDemoting: false,
			isDeleting: false,
		},
		canEdit: true,
		onEdit: vi.fn(),
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}

describe("UserActionsFooter", () => {
	test("renderiza o botão Editar dados e dispara onEdit ao clicar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /editar dados/i }))
		expect(props.onEdit).toHaveBeenCalledTimes(1)
	})

	test("oculta o botão Editar dados quando canEdit é false", () => {
		renderWithProviders(
			<UserActionsFooter {...baseProps()} canEdit={false} />,
		)
		expect(
			screen.queryByRole("button", { name: /editar dados/i }),
		).not.toBeInTheDocument()
	})

	test("renderiza o botão Mais ações sempre", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("renderiza o botão Mais ações mesmo quando canEdit é false", () => {
		renderWithProviders(
			<UserActionsFooter {...baseProps()} canEdit={false} />,
		)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("abre o dropdown e chama onOpenSuspend ao clicar em Inativar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /inativar/i }))
		expect(props.onOpenSuspend).toHaveBeenCalledTimes(1)
	})

	test("abre o dropdown e chama onOpenDelete ao clicar em Excluir", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /excluir/i }))
		expect(props.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("abre o dropdown e não exibe Excluir quando canDelete = false", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		props.permissions.canDelete = false
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		expect(
			screen.queryByRole("menuitem", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("abre o dropdown e chama onOpenPromote ao clicar em Tornar Admin", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(
			screen.getByRole("menuitem", { name: /tornar admin/i }),
		)
		expect(props.onOpenPromote).toHaveBeenCalledTimes(1)
	})

	test("botão Editar dados tem classe bg-accent", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })
		expect(btn.classList.contains("bg-accent")).toBe(true)
	})

	test("botão Editar dados fica desabilitado quando isPending = true", () => {
		const props = baseProps()
		props.flags.isPending = true
		renderWithProviders(<UserActionsFooter {...props} />)
		expect(
			screen.getByRole("button", { name: /editar dados/i }),
		).toBeDisabled()
	})

	test("FR-001: o botão Editar dados não exibe texto visível, só aria-label", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })
		expect(within(btn).queryByText("Editar dados")).not.toBeInTheDocument()
		expect(btn).toHaveAttribute("aria-label", "Editar dados")
	})

	test("FR-008: exibe tooltip 'Editar dados' no hover e no foco de teclado", async () => {
		const user = userEvent.setup()
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })

		await user.hover(btn)
		expect(await screen.findByText("Editar dados")).toBeInTheDocument()
		await user.unhover(btn)

		btn.focus()
		expect(await screen.findByText("Editar dados")).toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-actions-footer.test.tsx`
Expected: FAIL no teste "FR-001: o botão Editar dados não exibe texto visível, só aria-label" — o botão atual renderiza "Editar dados" como texto visível, então `within(btn).queryByText("Editar dados")` encontra o nó e `not.toBeInTheDocument()` falha; o `aria-label` também não existe ainda. (O teste FR-008 pode passar trivialmente neste estado intermediário, já que o texto do botão em si já está visível sem precisar de hover — isso é esperado e é corrigido pela migração do Step 3, que remove o texto visível do botão e o substitui por conteúdo exclusivo do `TooltipContent`.) Os demais testes (pré-existentes, agora usando `renderWithProviders`) continuam passando sem alteração de comportamento.

- **Step 3: Write minimal implementation**

Editar `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { ACTION_ICON } from "@/components/ui/status-icon"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AdminUser } from "@/features/admin/api/use-users"
import { type ActionFlags, MoreActionsMenu } from "./more-actions-menu"
import type { UserDetailPermissions } from "./use-user-detail-actions"

export interface UserActionsFooterProps {
	user: AdminUser
	permissions: UserDetailPermissions
	flags: ActionFlags
	canEdit: boolean
	onEdit: () => void
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
	onOpenDelete: () => void
}

const EditIcon = ACTION_ICON.edit

export function UserActionsFooter({
	permissions,
	flags,
	canEdit,
	onEdit,
	onActivate,
	onOpenSuspend,
	onOpenPromote,
	onOpenDemote,
	onOpenDelete,
}: UserActionsFooterProps) {
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
			{canEdit ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							size="icon"
							onClick={onEdit}
							disabled={flags.isPending}
							aria-label="Editar dados"
							className="bg-accent text-accent-foreground hover:bg-accent/90"
						>
							<EditIcon className="h-4 w-4" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Editar dados</TooltipContent>
				</Tooltip>
			) : null}
			<MoreActionsMenu
				permissions={permissions}
				flags={flags}
				onActivate={onActivate}
				onOpenSuspend={onOpenSuspend}
				onOpenPromote={onOpenPromote}
				onOpenDemote={onOpenDemote}
				onOpenDelete={onOpenDelete}
			/>
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-actions-footer.test.tsx`
Expected: PASS (todos os 12 testes do arquivo)

- **Step 5: Commit** *(esta task participa da Wave 3 em paralelo com as tasks 5, 7 e 8, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx
git commit -m "feat: botao Editar dados vira icone-so com aria-label e tooltip (FR-001, FR-008)"
```

## Critérios de Sucesso

- O botão "Editar dados" não exibe texto visível; carrega `aria-label="Editar dados"` e ícone `Pencil` (via `ACTION_ICON.edit`).
- O tooltip "Editar dados" aparece tanto no hover do mouse quanto no foco de teclado do botão.
- `onClick={onEdit}` e `disabled={flags.isPending}` continuam funcionando como antes.
- Todos os testes de `user-actions-footer.test.tsx` (pré-existentes e novos) passam usando `renderWithProviders`, garantindo que o `Tooltip.Root` sempre tenha um `TooltipProvider` ancestral em teste.
