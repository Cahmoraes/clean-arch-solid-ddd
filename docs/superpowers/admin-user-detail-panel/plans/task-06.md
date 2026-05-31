# Task 6: `UserActionsFooter` (ações + confirmações + excluir desabilitado) [RF-014, RF-015, RF-016, RF-017, RF-019]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** task-02

## Visão Geral

Cria o rodapé de ações do painel: Editar, Ativar/Suspender, Promover/Revogar admin e Excluir. As ações são contextuais ao estado do usuário (via permissões do hook da task 2). As ações destrutivas abrem os ConfirmationDialogs (task 2). "Excluir" fica **desabilitado** com tooltip de indisponibilidade, pois não há endpoint de exclusão. "Editar" dispara um callback (o formulário de edição em si está fora do escopo desta task).

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: Button, AlertDialog
- use tanstack-query-best-practices skill: consumo de flags de mutation
- use test-antipatterns skill + vitest skill: testes de interação e estado desabilitado

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserActionsFooter } from "./user-actions-footer"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
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
			isLocked: false,
		},
		flags: {
			isPending: false,
			isActivating: false,
			isSuspending: false,
			isPromoting: false,
			isDemoting: false,
		},
		onEdit: vi.fn(),
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
	}
}

describe("UserActionsFooter", () => {
	test("renderiza o botão Editar e dispara onEdit", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /editar/i }))
		expect(props.onEdit).toHaveBeenCalledTimes(1)
	})

	test("abre confirmação ao clicar em Inativar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /inativar/i }))
		expect(props.onOpenSuspend).toHaveBeenCalledTimes(1)
	})

	test("mantém o botão Excluir desabilitado (sem endpoint)", () => {
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		expect(screen.getByRole("button", { name: /excluir/i })).toBeDisabled()
	})

	test("oculta Inativar quando não permitido", () => {
		const props = baseProps()
		props.permissions.canSuspend = false
		render(<UserActionsFooter {...props} />)
		expect(
			screen.queryByRole("button", { name: /inativar/i }),
		).not.toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "UserActionsFooter"`
Expected: FAIL — `Failed to resolve import "./user-actions-footer"`.

- **Step 3: Implementar o `UserActionsFooter`**

Crie `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`:

```tsx
import { Button } from "@/components/ui/button"
import type { AdminUser } from "@/features/admin/api/use-users"
import type { UserDetailPermissions } from "./use-user-detail-actions"

export interface UserActionsFooterProps {
	user: AdminUser
	permissions: UserDetailPermissions
	flags: {
		isPending: boolean
		isActivating: boolean
		isSuspending: boolean
		isPromoting: boolean
		isDemoting: boolean
	}
	onEdit: () => void
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
}

export function UserActionsFooter({
	permissions,
	flags,
	onEdit,
	onActivate,
	onOpenSuspend,
	onOpenPromote,
	onOpenDemote,
}: UserActionsFooterProps) {
	const activateLabel = permissions.isLocked ? "Desbloquear" : "Ativar"
	return (
		<div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
			<Button
				onClick={onEdit}
				disabled={flags.isPending}
				className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-primary-strong"
			>
				Editar dados
			</Button>

			{permissions.canActivate ? (
				<Button
					onClick={onActivate}
					disabled={flags.isPending}
					aria-busy={flags.isActivating}
					variant="outline"
					className="h-11 rounded-md px-4 font-semibold"
				>
					{flags.isActivating ? "Processando..." : activateLabel}
				</Button>
			) : null}

			{permissions.canSuspend ? (
				<Button
					onClick={onOpenSuspend}
					disabled={flags.isPending}
					aria-busy={flags.isSuspending}
					className="h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
				>
					Inativar
				</Button>
			) : null}

			{permissions.canPromoteToAdmin ? (
				<Button
					onClick={onOpenPromote}
					disabled={flags.isPending}
					aria-busy={flags.isPromoting}
					variant="outline"
					className="h-11 rounded-md px-4 font-semibold"
				>
					Tornar Admin
				</Button>
			) : null}

			{permissions.canDemoteFromAdmin ? (
				<Button
					onClick={onOpenDemote}
					disabled={flags.isPending}
					aria-busy={flags.isDemoting}
					variant="outline"
					className="h-11 rounded-md px-4 font-semibold"
				>
					Revogar Admin
				</Button>
			) : null}

			<Button
				type="button"
				disabled
				title="Exclusão indisponível: endpoint não implementado"
				className="ml-auto h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive opacity-60"
			>
				Excluir
			</Button>
		</div>
	)
}
```

> Verifique as `variant` disponíveis do `Button` em `apps/frontend/src/components/ui/button.tsx`. Se `outline` não existir, use a `variant` equivalente do projeto ou apenas classes utilitárias como nos demais botões.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "UserActionsFooter"`
Expected: PASS — 4 testes passam.

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx
git commit -m "feat(frontend): add UserActionsFooter with contextual actions"
```

## Critérios de Sucesso

- O rodapé exibe Editar (RF-017) e dispara o callback de edição.
- Ações de status/permissão aparecem conforme as permissões (RF-016) e abrem confirmação (RF-015).
- Flags `aria-busy` refletem mutations em andamento (RF-018, via task 7 integração).
- "Excluir" permanece desabilitado enquanto não há endpoint (RF-019).
- Todas as ações administrativas estão presentes (RF-014).
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
