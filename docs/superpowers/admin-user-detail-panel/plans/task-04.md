# Task 4: `PermissionsTab` [RF-009]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** task-02

## Visão Geral

Cria o conteúdo da aba **Permissões**: exibe a role atual do usuário e oferece a ação rápida de promover/revogar admin. Os controles e flags vêm do hook `useUserDetailActions` (task 2) via props, mantendo a tab como componente de apresentação puro.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/permissions-tab.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: componente de apresentação com Button/RoleBadge
- use tailwindcss skill: layout e tokens
- use test-antipatterns skill + vitest skill: testes de renderização e interação

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/permissions-tab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { PermissionsTab } from "./permissions-tab"

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

describe("PermissionsTab", () => {
	test("exibe a role atual do usuário", () => {
		render(
			<PermissionsTab
				user={buildUser({ role: "ADMIN" })}
				canPromoteToAdmin={false}
				canDemoteFromAdmin={true}
				isPending={false}
				onPromote={vi.fn()}
				onDemote={vi.fn()}
			/>,
		)
		expect(screen.getByText("Administrador")).toBeInTheDocument()
	})

	test("dispara onPromote ao clicar em tornar administrador", async () => {
		const user = userEvent.setup()
		const onPromote = vi.fn()
		render(
			<PermissionsTab
				user={buildUser({ role: "MEMBER" })}
				canPromoteToAdmin={true}
				canDemoteFromAdmin={false}
				isPending={false}
				onPromote={onPromote}
				onDemote={vi.fn()}
			/>,
		)
		await user.click(screen.getByRole("button", { name: /tornar administrador/i }))
		expect(onPromote).toHaveBeenCalledTimes(1)
	})

	test("não renderiza ações quando nenhuma é permitida", () => {
		render(
			<PermissionsTab
				user={buildUser()}
				canPromoteToAdmin={false}
				canDemoteFromAdmin={false}
				isPending={false}
				onPromote={vi.fn()}
				onDemote={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("button")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "PermissionsTab"`
Expected: FAIL — `Failed to resolve import "./permissions-tab"`.

- **Step 3: Implementar o `PermissionsTab`**

Crie `apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx`:

```tsx
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/ui/role-badge"
import type { AdminUser } from "@/features/admin/api/use-users"

export interface PermissionsTabProps {
	user: AdminUser
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	isPending: boolean
	onPromote: () => void
	onDemote: () => void
}

function roleLabel(role: AdminUser["role"]): string {
	return role === "ADMIN" ? "Administrador" : "Membro"
}

function roleDescription(role: AdminUser["role"]): string {
	return role === "ADMIN"
		? "Acesso total ao painel — gerencia usuários e configurações."
		: "Acesso somente às próprias informações."
}

export function PermissionsTab({
	user,
	canPromoteToAdmin,
	canDemoteFromAdmin,
	isPending,
	onPromote,
	onDemote,
}: PermissionsTabProps) {
	const hasActions = canPromoteToAdmin || canDemoteFromAdmin
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
				<div className="flex flex-col gap-1">
					<span className="text-sm font-semibold text-card-foreground">
						{roleLabel(user.role)}
					</span>
					<span className="text-xs text-muted-foreground">
						{roleDescription(user.role)}
					</span>
				</div>
				<RoleBadge role={user.role} />
			</div>

			{hasActions ? (
				<div className="flex flex-wrap gap-2">
					{canPromoteToAdmin ? (
						<Button
							onClick={onPromote}
							disabled={isPending}
							className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-primary-strong"
						>
							Tornar Administrador
						</Button>
					) : null}
					{canDemoteFromAdmin ? (
						<Button
							onClick={onDemote}
							disabled={isPending}
							className="h-11 rounded-md bg-destructive-soft px-4 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
						>
							Remover Administrador
						</Button>
					) : null}
				</div>
			) : null}
		</div>
	)
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "PermissionsTab"`
Expected: PASS — 3 testes passam.

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/permissions-tab.tsx apps/frontend/src/features/admin/components/user-detail/permissions-tab.test.tsx
git commit -m "feat(frontend): add PermissionsTab to user detail panel"
```

## Critérios de Sucesso

- A aba exibe a role atual com rótulo e descrição (RF-009).
- Os botões de promover/revogar aparecem conforme as permissões e disparam os callbacks.
- Nenhuma ação é renderizada quando ambas as permissões são falsas.
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
