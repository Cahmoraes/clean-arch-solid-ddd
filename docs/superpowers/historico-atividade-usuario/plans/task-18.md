# Task 18: user-detail-panel.tsx busca e passa events para ActivityTab [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-historico-atividade-usuario.md`
**Spec:** `../specs/historico-atividade-usuario-design.md`
**Tier:** cheap
**Depends on:** task-16, task-17

## Visão Geral

Conectar o hook `useUserActivity` (task 16) ao `ActivityTab` (task 17) dentro de `UserDetailPanel`: hoje `<ActivityTab />` é renderizado sem props, sempre mostrando o estado vazio. `UserDetailTabs` (subcomponente interno de `user-detail-panel.tsx`) já recebe `user` e `activeTab` — basta chamar `useUserActivity(user.id, { enabled: activeTab === "atividade" })` ali e passar `events`, `isLoading` e `isError` do resultado da query para `<ActivityTab />` (task 17 já aceita esses 2 últimos), evitando buscar o histórico antes da aba ser aberta (FR-001) e evitando que uma falha de rede seja exibida como "sem atividade" (achado de revisão).

Como o hook agora dispara uma requisição HTTP real ao abrir a aba "Atividade", o handler MSW padrão de `GET /users/:userId/activity` precisa existir em `src/test/msw/handlers.ts` (o projeto roda com `onUnhandledRequest: "error"` em todos os testes) para que o teste pré-existente `user-detail-panel.test.tsx` continue passando sem precisar registrar um handler local.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: `enabled: activeTab === "atividade"` evita a busca antes da aba estar visível, mesmo padrão já usado por `enabled` em `useUsers`.
- `vercel-react-best-practices`: o fetch fica localizado no componente que já tem `user.id` e `activeTab` em escopo (`UserDetailTabs`), sem prop-drilling adicional nem estado duplicado.
- `test-antipatterns`: o handler MSW adicionado é um stub determinístico (`{ events: [] }`), consistente com os demais handlers padrão do arquivo — o teste não mocka o hook `useUserActivity` diretamente.

## Passos

- **Step 1: Escrever o teste falhando**

Adicionar ao final de `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx` (que já importa `render`, `screen`, `within`, `userEvent`, `QueryClientProvider`, `TooltipProvider`, `buildUser`, `renderPanel`):

```typescript
	test("busca o histórico de atividade ao abrir a aba Atividade e exibe o evento retornado", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(
				`${apiBaseUrl}/users/:userId/activity`,
				() =>
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
						},
						{ status: 200 },
					),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("exibe mensagem de erro (não o estado vazio) quando a busca de atividade falha", async () => {
		const user = userEvent.setup()
		server.use(
			http.get(
				`${apiBaseUrl}/users/:userId/activity`,
				() => HttpResponse.json({ message: "Internal error" }, { status: 500 }),
			),
		)

		renderPanel(buildUser({ id: "u1" }))
		await user.click(screen.getByRole("tab", { name: "Atividade" }))

		expect(
			await screen.findByText("Não foi possível carregar o histórico de atividade."),
		).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})
```

E adicionar os imports necessários no topo do arquivo:

```typescript
import { HttpResponse, http } from "msw"
import { server } from "@/test/msw/server"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx` (a partir de `apps/frontend/`)
Expected: FAIL — "Login realizado" nunca aparece, pois `ActivityTab` ainda é renderizado sem `events` (sempre mostra o estado vazio).

- **Step 3: Implementação mínima**

Em `apps/frontend/src/test/msw/handlers.ts`, adicionar o handler padrão logo após `http.get(endpoint("/users/:userId"), ...)`:

```typescript
	http.get(endpoint("/users/:userId"), () =>
		HttpResponse.json({ id: "user-stub", name: "Stub User" }, { status: 200 }),
	),
	http.get(endpoint("/users/:userId/activity"), () =>
		HttpResponse.json({ events: [] }, { status: 200 }),
	),
```

Em `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`, importar o hook e usá-lo dentro de `UserDetailTabs`:

```typescript
"use client"

import { useState } from "react"
import { Avatar } from "@/components/ui/avatar"
import { RoleBadge } from "@/components/ui/role-badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserActivity } from "@/features/admin/api/use-user-activity"
import type { AdminUser } from "@/features/admin/api/use-users"
import { ActivityTab } from "./activity-tab"
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
		data: activityEvents,
		isLoading: isActivityLoading,
		isError: isActivityError,
	} = useUserActivity(user.id, {
		enabled: activeTab === "atividade",
	})

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
			<TabsContent value="atividade">
				<ActivityTab
					events={activityEvents}
					isLoading={isActivityLoading}
					isError={isActivityError}
				/>
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

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `vitest run src/features/admin/components/user-detail/user-detail-panel.test.tsx` (a partir de `apps/frontend/`)
Expected: PASS — todos os testes do arquivo, incluindo o novo e o pré-existente "alterna para a aba Atividade ao clicar" (que agora recebe `{ events: [] }` do handler padrão e continua mostrando o estado vazio).

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-panel.test.tsx apps/frontend/src/test/msw/handlers.ts
git commit -m "feat: conecta useUserActivity ao ActivityTab no painel de detalhes do usuário"
```

## Critérios de Sucesso

- Abrir a aba "Atividade" dispara `useUserActivity(user.id, { enabled: true })` e renderiza os eventos retornados (FR-001).
- A aba "Detalhes" (aba inicial) não dispara a busca de atividade — só ocorre ao trocar para "atividade".
- Uma falha na busca (500) exibe a mensagem de erro de `ActivityTab` (`isError`), nunca o estado vazio — achado de revisão.
- O teste pré-existente "alterna para a aba Atividade ao clicar" continua passando sem modificação de asserção, agora respaldado pelo handler MSW padrão de `GET /users/:userId/activity`.
- Todos os testes de `user-detail-panel.test.tsx`, incluindo os pré-existentes, passam.
