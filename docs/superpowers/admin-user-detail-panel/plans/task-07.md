# Task 7: `UserDetailPanel` (header + Tabs + footer) [RF-007, RF-012, RF-013, RF-022]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** task-02, task-03, task-04, task-05, task-06

## Visão Geral

Compõe o painel completo de detalhes: cabeçalho de identidade (avatar, nome, e-mail, badges de status e role), as três abas (`Detalhes`/`Permissões`/`Atividade`) usando `Tabs` do shadcn, o rodapé de ações e os três ConfirmationDialogs. Este é o componente compartilhado que será renderizado tanto no split-view (desktop) quanto no Dialog (mobile) pela task 8. Consome `useUserDetailActions` (task 2) para mutations/permissões/estado de confirmação.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: Tabs, Avatar, badges
- use vercel-composition-patterns skill: composição do painel a partir de subcomponentes
- use tailwindcss skill: layout do header e do corpo com scroll
- use test-antipatterns skill + vitest skill: testes de renderização com QueryClient provider

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserDetailPanel } from "./user-detail-panel"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		...overrides,
	}
}

function renderPanel(user: AdminUser) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return render(<UserDetailPanel user={user} onEdit={vi.fn()} />, { wrapper })
}

describe("UserDetailPanel", () => {
	test("exibe nome, e-mail e as três abas", () => {
		renderPanel(buildUser())
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Permissões" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Atividade" })).toBeInTheDocument()
	})

	test("alterna para a aba Atividade ao clicar", async () => {
		const user = userEvent.setup()
		renderPanel(buildUser())
		await user.click(screen.getByRole("tab", { name: "Atividade" }))
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe o e-mail no cabeçalho de identidade", () => {
		renderPanel(buildUser())
		expect(screen.getByText("joao@example.com")).toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "UserDetailPanel"`
Expected: FAIL — `Failed to resolve import "./user-detail-panel"`.

- **Step 3: Implementar o `UserDetailPanel`**

Crie `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`:

```tsx
"use client"

import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { AdminUser } from "@/features/admin/api/use-users"
import { cn } from "@/lib/cn"
import { ActivityTab } from "./activity-tab"
import {
	DemoteConfirmationDialog,
	PromoteConfirmationDialog,
	SuspendConfirmationDialog,
} from "./confirmation-dialogs"
import { DetailsTab } from "./details-tab"
import { PermissionsTab } from "./permissions-tab"
import { useUserDetailActions } from "./use-user-detail-actions"
import { UserActionsFooter } from "./user-actions-footer"
import { statusBadgeClassName, statusLabel } from "./user-detail-format"

export interface UserDetailPanelProps {
	user: AdminUser
	onEdit: () => void
}

function InlineError({ message }: { message: string | null }) {
	if (!message) return null
	return (
		<p
			role="alert"
			className="rounded-[12px] border border-transparent bg-destructive-soft px-4 py-3 text-sm text-destructive"
		>
			{message}
		</p>
	)
}

export function UserDetailPanel({ user, onEdit }: UserDetailPanelProps) {
	const actions = useUserDetailActions(user)

	return (
		<div className="flex flex-col gap-4">
			<header className="flex items-start gap-3">
				<Avatar name={user.name} size="lg" />
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="text-lg font-semibold text-foreground">
						{user.name}
					</span>
					<span className="truncate font-mono text-sm text-muted-foreground">
						{user.email}
					</span>
					<div className="flex flex-wrap gap-2 pt-1">
						<span
							className={cn(
								"inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium",
								statusBadgeClassName(user.status),
							)}
						>
							{statusLabel(user.status)}
						</span>
						<RoleBadge role={user.role} />
					</div>
				</div>
			</header>

			<InlineError message={actions.errorMessage} />

			<Tabs defaultValue="detalhes" className="flex flex-col gap-4">
				<TabsList>
					<TabsTrigger value="detalhes">Detalhes</TabsTrigger>
					<TabsTrigger value="permissoes">Permissões</TabsTrigger>
					<TabsTrigger value="atividade">Atividade</TabsTrigger>
				</TabsList>
				<TabsContent value="detalhes">
					<DetailsTab user={user} />
				</TabsContent>
				<TabsContent value="permissoes">
					<PermissionsTab
						user={user}
						canPromoteToAdmin={actions.permissions.canPromoteToAdmin}
						canDemoteFromAdmin={actions.permissions.canDemoteFromAdmin}
						isPending={actions.flags.isPending}
						onPromote={() => actions.confirm.setPromoteOpen(true)}
						onDemote={() => actions.confirm.setDemoteOpen(true)}
					/>
				</TabsContent>
				<TabsContent value="atividade">
					<ActivityTab />
				</TabsContent>
			</Tabs>

			<UserActionsFooter
				user={user}
				permissions={actions.permissions}
				flags={actions.flags}
				onEdit={onEdit}
				onActivate={actions.onActivate}
				onOpenSuspend={() => actions.confirm.setSuspendOpen(true)}
				onOpenPromote={() => actions.confirm.setPromoteOpen(true)}
				onOpenDemote={() => actions.confirm.setDemoteOpen(true)}
			/>

			{actions.confirm.suspendOpen ? (
				<SuspendConfirmationDialog
					open={actions.confirm.suspendOpen}
					onOpenChange={actions.confirm.setSuspendOpen}
					isPending={actions.flags.isPending}
					isSuspending={actions.flags.isSuspending}
					onConfirm={actions.onConfirmSuspend}
				/>
			) : null}

			{actions.confirm.promoteOpen ? (
				<PromoteConfirmationDialog
					open={actions.confirm.promoteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setPromoteOpen}
					isPending={actions.flags.isPending}
					isPromoting={actions.flags.isPromoting}
					onConfirm={actions.onConfirmPromote}
				/>
			) : null}

			{actions.confirm.demoteOpen ? (
				<DemoteConfirmationDialog
					open={actions.confirm.demoteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setDemoteOpen}
					isPending={actions.flags.isPending}
					isDemoting={actions.flags.isDemoting}
					onConfirm={actions.onConfirmDemote}
				/>
			) : null}
		</div>
	)
}
```

> Verifique a API real do `Tabs` em `apps/frontend/src/components/ui/tabs.tsx` (exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` e a prop `defaultValue`) e do `Avatar` (prop `size` aceita `"lg"`). Ajuste valores de `size` se o componente só aceitar `"sm"`/`"md"`.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "UserDetailPanel"`
Expected: PASS — 3 testes passam.

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx
git commit -m "feat(frontend): compose UserDetailPanel with tabs and actions"
```

## Critérios de Sucesso

- O cabeçalho exibe avatar, nome, e-mail e badges de status e role (RF-012, RF-013).
- As três abas estão presentes e navegáveis por teclado/click (RF-007, RF-022).
- O painel integra footer de ações e os três ConfirmationDialogs.
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
