# Task 3: Frontend: card resumido no drawer de `/admin/usuarios`

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/paginacao-atividade-admin-usuarios-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

No drawer de detalhes do usuário (`/admin/usuarios`), a aba "Atividade" hoje renderiza todos os eventos retornados pelo endpoint, sem limite. Esta task corta a exibição para os 5 eventos mais recentes e adiciona um link "Ver histórico completo" para a nova rota (task-04), visível apenas quando existem mais de 5 eventos no total. O componente `ActivityTab` não é alterado — ele já esconde seu footer de paginação quando a prop `pagination` não é passada.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: derivar `activitySummaryEvents`/`hasMoreActivity` a partir dos dados já buscados pelo hook, sem novo estado local nem efeito
- `vercel-composition-patterns`: o corte e o link de navegação ficam no componente pai (`UserDetailTabs`), sem alterar a API do `ActivityTab` — decisão já registrada no spec (D1)
- `shadcn`: usar `Button asChild` (padrão Radix `Slot`) para compor o botão com o `Link` do Next.js, em vez de estilizar uma âncora manualmente
- `tailwindcss`: `className="w-full"` no botão, seguindo o padrão de largura total já usado em outros botões de rodapé do drawer
- `tanstack-query-best-practices`: consumir `pagination.total` retornado pelo hook (já implementado na task-02) em vez de recalcular a contagem no componente
- `test-antipatterns`: os testes continuam usando MSW (`server.use`) para simular a resposta paginada — não mockar `useUserActivity` diretamente

## Passos

- **Step 1: Adicionar os testes de corte e do link condicional**

```tsx
// apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx
// Adicionar estes dois testes ao describe("UserDetailPanel", ...), após o teste
// "busca o histórico de atividade ao abrir a aba Atividade e exibe o evento retornado":

	test("exibe no máximo 5 eventos e o link para o histórico completo quando há mais de 5", async () => {
		const user = userEvent.setup()
		const events = Array.from({ length: 7 }, (_, index) => ({
			id: `activity-${index + 1}`,
			type: "LOGIN" as const,
			description: `Evento ${index + 1}`,
			occurredAt: new Date().toISOString(),
		}))
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events,
						pagination: { page: 1, pageSize: 20, total: 7, totalPages: 1 },
					},
					{ status: 200 },
				),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Evento 1")).toBeInTheDocument()
		expect(screen.getByText("Evento 5")).toBeInTheDocument()
		expect(screen.queryByText("Evento 6")).not.toBeInTheDocument()
		expect(screen.queryByText("Evento 7")).not.toBeInTheDocument()

		const link = screen.getByRole("link", { name: "Ver histórico completo" })
		expect(link).toHaveAttribute("href", "/admin/usuarios/u1/atividade")
	})

	test("não exibe o link para o histórico completo quando há 5 eventos ou menos", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () =>
				HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: new Date().toISOString(),
							},
						],
						pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
					},
					{ status: 200 },
				),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
		expect(
			screen.queryByRole("link", { name: "Ver histórico completo" }),
		).not.toBeInTheDocument()
	})
```

- **Step 2: Rodar os testes para verificar que falham**

Run (dentro de `apps/frontend`): `npx vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: FAIL — os dois novos testes falham porque todos os 7 eventos são exibidos hoje e o link "Ver histórico completo" ainda não existe.

- **Step 3: Implementar o corte e o link no componente**

```tsx
// apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx
"use client"

import Link from "next/link"
import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserActivity } from "@/features/activity/api/use-user-activity"
import { ActivityTab } from "@/features/activity/components/activity-tab"
import type { AdminUser } from "@/features/admin/api/use-users"
import {
	DeleteConfirmationDialog,
	DemoteConfirmationDialog,
	PromoteConfirmationDialog,
	SuspendConfirmationDialog,
} from "./confirmation-dialogs"
import { DetailsTab } from "./details-tab"
import type { UserDetailActions } from "./use-user-detail-actions"
import {
	canEditAnything,
	useUserDetailActions,
} from "./use-user-detail-actions"
import { UserActionsFooter } from "./user-actions-footer"
import { statusLabel, statusTone } from "./user-detail-format"

const ACTIVITY_SUMMARY_LIMIT = 5

export interface UserDetailPanelProps {
	user: AdminUser
	onClose?: () => void
	onUserPatched?: (patch: Partial<AdminUser>) => void
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

function UserIdentityHeader({ user }: { user: AdminUser }) {
	return (
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
					<StatusBadge tone={statusTone(user.status)}>
						{statusLabel(user.status)}
					</StatusBadge>
					<RoleBadge role={user.role} />
				</div>
			</div>
		</header>
	)
}

function UserDetailTabs({
	user,
	actions,
	activeTab,
	onTabChange,
	editing,
	onStopEdit,
}: {
	user: AdminUser
	actions: UserDetailActions
	activeTab: string
	onTabChange: (tab: string) => void
	editing: boolean
	onStopEdit: () => void
}) {
	const {
		data: activityData,
		isLoading: isActivityLoading,
		isError: isActivityError,
	} = useUserActivity(user.id, {
		enabled: activeTab === "atividade",
		page: 1,
	})

	const activitySummaryEvents = activityData?.events.slice(
		0,
		ACTIVITY_SUMMARY_LIMIT,
	)
	const hasMoreActivity =
		(activityData?.pagination?.total ?? 0) > ACTIVITY_SUMMARY_LIMIT

	return (
		<Tabs
			value={activeTab}
			onValueChange={onTabChange}
			className="flex flex-col gap-4"
		>
			<TabsList>
				<TabsTrigger value="detalhes">Detalhes</TabsTrigger>
				<TabsTrigger value="atividade">Atividade</TabsTrigger>
			</TabsList>
			<TabsContent value="detalhes">
				<DetailsTab
					user={user}
					permissions={actions.permissions}
					editing={editing}
					onStopEdit={onStopEdit}
				/>
			</TabsContent>
			<TabsContent value="atividade" className="flex flex-col gap-3">
				<ActivityTab
					events={activitySummaryEvents}
					isLoading={isActivityLoading}
					isError={isActivityError}
				/>
				{hasMoreActivity ? (
					<Button asChild variant="outline" className="w-full">
						<Link href={`/admin/usuarios/${user.id}/atividade`}>
							Ver histórico completo
						</Link>
					</Button>
				) : null}
			</TabsContent>
		</Tabs>
	)
}

function ConfirmationDialogs({
	user,
	actions,
}: {
	user: AdminUser
	actions: UserDetailActions
}) {
	return (
		<>
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
			{actions.confirm.deleteOpen ? (
				<DeleteConfirmationDialog
					open={actions.confirm.deleteOpen}
					userName={user.name}
					onOpenChange={actions.confirm.setDeleteOpen}
					isPending={actions.flags.isPending}
					isDeleting={actions.flags.isDeleting}
					onConfirm={actions.onConfirmDelete}
				/>
			) : null}
		</>
	)
}

export function UserDetailPanel({
	user,
	onClose,
	onUserPatched,
}: UserDetailPanelProps) {
	const actions = useUserDetailActions(user, {
		onDeleteSuccess: onClose,
		onUserPatched,
	})
	const [activeTab, setActiveTab] = useState("detalhes")
	const [editing, setEditing] = useState(false)
	const canEdit = canEditAnything(actions.permissions)

	function handleStartEdit() {
		setActiveTab("detalhes")
		setEditing(true)
	}

	return (
		<div className="flex flex-col gap-4">
			<UserIdentityHeader user={user} />
			<InlineError message={actions.errorMessage} />
			<UserDetailTabs
				user={user}
				actions={actions}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				editing={editing}
				onStopEdit={() => setEditing(false)}
			/>
			<UserActionsFooter
				user={user}
				permissions={actions.permissions}
				flags={actions.flags}
				canEdit={canEdit && !editing}
				onEdit={handleStartEdit}
				onActivate={actions.onActivate}
				onOpenSuspend={() => actions.confirm.setSuspendOpen(true)}
				onOpenPromote={() => actions.confirm.setPromoteOpen(true)}
				onOpenDemote={() => actions.confirm.setDemoteOpen(true)}
				onOpenDelete={() => actions.confirm.setDeleteOpen(true)}
			/>
			<ConfirmationDialogs user={user} actions={actions} />
		</div>
	)
}
```

- **Step 4: Rodar os testes para verificar que passam**

Run (dentro de `apps/frontend`): `npx vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx`
Expected: PASS — todos os testes do arquivo, incluindo os dois novos.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx \
  apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx
git commit -m "feat(activity): limita card do drawer admin a 5 itens com link para histórico completo"
```

## Critérios de Sucesso

- O card de atividade do drawer em `/admin/usuarios` exibe no máximo 5 eventos, mesmo quando a API retorna mais.
- O link "Ver histórico completo" aparece apenas quando `pagination.total > 5`, apontando para `/admin/usuarios/{userId}/atividade`.
- Com 5 eventos ou menos, o link não é exibido.
- `ActivityTab` continua sem a prop `pagination` no drawer — nenhum footer de paginação aparece ali.
