# Task 2: Extrair `useUserDetailActions` + ConfirmationDialogs [RF-014, RF-016, RF-018]

**Status:** PENDING
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** N/A

## Visão Geral

A lógica de mutations, permissões e estado de confirmação hoje vive embutida em `user-detail-modal.tsx`. Esta task extrai essa lógica para um hook reutilizável `useUserDetailActions(user)` e move os três diálogos de confirmação (`Suspend`/`Promote`/`Demote`) para um módulo próprio, para que o novo painel (split-view e mobile) reaproveite tudo sem duplicação. O `user-detail-modal.tsx` permanece intocado nesta task (será removido na task 9).

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts`
- Create: `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.test.tsx`

### Conformidade com as Skills Padrão

- use tanstack-query-best-practices skill: mutations, estados `isPending`, invalidação
- use react skill: hooks compostos, estado de UI
- use shadcn skill: AlertDialog de confirmação
- use test-antipatterns skill + vitest skill: testes do hook com MSW e QueryClient
- use typescript-advanced skill: tipagem do retorno agregado

## Passos

- **Step 1: Escrever o teste que falha (hook de ações)**

Crie `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { useUserDetailActions } from "./use-user-detail-actions"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

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

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useUserDetailActions", () => {
	test("expõe permissão de promover para membro ativo", () => {
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ role: "MEMBER" })),
			{ wrapper: wrapper() },
		)
		expect(result.current.permissions.canPromoteToAdmin).toBe(true)
		expect(result.current.permissions.canDemoteFromAdmin).toBe(false)
	})

	test("não permite suspender o próprio usuário logado", () => {
		useAuthStore.getState().setUserForTests?.({ id: "u1" })
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u1", role: "MEMBER" })),
			{ wrapper: wrapper() },
		)
		expect(result.current.permissions.canSuspend).toBe(false)
	})

	test("controla o estado de abertura do diálogo de suspensão", () => {
		const { result } = renderHook(() => useUserDetailActions(buildUser()), {
			wrapper: wrapper(),
		})
		expect(result.current.confirm.suspendOpen).toBe(false)
		act(() => result.current.confirm.setSuspendOpen(true))
		expect(result.current.confirm.suspendOpen).toBe(true)
	})

	test("executa a ativação chamando o endpoint", async () => {
		let called = false
		server.use(
			http.patch(`${apiBaseUrl}/users/activate`, () => {
				called = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ status: "suspended" })),
			{ wrapper: wrapper() },
		)
		act(() => result.current.onActivate())
		await waitFor(() => expect(called).toBe(true))
	})
})
```

> Nota: o teste usa `useAuthStore.getState().setUserForTests?.(...)` de forma opcional. Se o store não expuser esse helper, ajuste para o setter real do `auth-store` (ex.: `useAuthStore.setState({ user: { id: "u1" } as never })`). Verifique a API real do store antes de rodar.

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "useUserDetailActions"`
Expected: FAIL — `Failed to resolve import "./use-user-detail-actions"`.

- **Step 3: Implementar o hook (extraindo a lógica do modal)**

Crie `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts`. Copie a lógica de permissões/mutations de `user-detail-modal.tsx` (funções `useUserPermissions`, `useUserMutations`, `resolveErrorMessage`, `getErrorMessage` e os handlers de confirmação):

```ts
"use client"

import { type MouseEvent, useEffect, useState } from "react"
import { useActivateUser } from "@/features/admin/api/use-activate-user"
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { useSuspendUser } from "@/features/admin/api/use-suspend-user"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"

const SUPER_ADMIN_EMAIL = "admin@admin.com"

export interface UserDetailPermissions {
	canSuspend: boolean
	canActivate: boolean
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	isLocked: boolean
}

function resolvePermissions(
	user: AdminUser,
	currentUserId: string | null | undefined,
): UserDetailPermissions {
	const isLocked = user.status === "locked"
	const canSuspend =
		(user.status === "activated" || isLocked) &&
		user.role !== "ADMIN" &&
		currentUserId !== user.id
	const canActivate = user.status === "suspended" || isLocked
	const canPromoteToAdmin =
		user.status === "activated" &&
		user.role === "MEMBER" &&
		user.email !== SUPER_ADMIN_EMAIL
	const canDemoteFromAdmin =
		user.role === "ADMIN" &&
		currentUserId !== user.id &&
		user.email !== SUPER_ADMIN_EMAIL
	return { canSuspend, canActivate, canPromoteToAdmin, canDemoteFromAdmin, isLocked }
}

function getErrorMessage(mutation: {
	isError: boolean
	error?: { userMessage?: string } | null
}): string | null {
	return mutation.isError ? (mutation.error?.userMessage ?? null) : null
}

export interface UserDetailActions {
	permissions: UserDetailPermissions
	flags: {
		isPending: boolean
		isActivating: boolean
		isSuspending: boolean
		isPromoting: boolean
		isDemoting: boolean
	}
	errorMessage: string | null
	confirm: {
		suspendOpen: boolean
		promoteOpen: boolean
		demoteOpen: boolean
		setSuspendOpen: (open: boolean) => void
		setPromoteOpen: (open: boolean) => void
		setDemoteOpen: (open: boolean) => void
	}
	onActivate: () => void
	onConfirmSuspend: (event: MouseEvent<HTMLButtonElement>) => void
	onConfirmPromote: (event: MouseEvent<HTMLButtonElement>) => void
	onConfirmDemote: (event: MouseEvent<HTMLButtonElement>) => void
}

export function useUserDetailActions(user: AdminUser): UserDetailActions {
	const currentUser = useAuthStore((state) => state.user)
	const activateUser = useActivateUser()
	const suspendUser = useSuspendUser()
	const promoteToAdmin = usePromoteToAdmin()
	const demoteFromAdmin = useDemoteFromAdmin()
	const [suspendOpen, setSuspendOpen] = useState(false)
	const [promoteOpen, setPromoteOpen] = useState(false)
	const [demoteOpen, setDemoteOpen] = useState(false)

	useEffect(() => {
		setSuspendOpen(false)
		setPromoteOpen(false)
		setDemoteOpen(false)
	}, [])

	const isPending =
		activateUser.isPending ||
		suspendUser.isPending ||
		promoteToAdmin.isPending ||
		demoteFromAdmin.isPending

	const errorMessage =
		getErrorMessage(demoteFromAdmin) ??
		getErrorMessage(promoteToAdmin) ??
		getErrorMessage(suspendUser) ??
		getErrorMessage(activateUser)

	function onConfirmSuspend(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		suspendUser.mutate(user.id, {
			onSuccess: () => setSuspendOpen(false),
			onError: () => setSuspendOpen(false),
		})
	}

	function onConfirmPromote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		promoteToAdmin.mutate(user.id, {
			onSuccess: () => setPromoteOpen(false),
			onError: () => setPromoteOpen(false),
		})
	}

	function onConfirmDemote(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		demoteFromAdmin.mutate(user.id, {
			onSuccess: () => setDemoteOpen(false),
			onError: () => setDemoteOpen(false),
		})
	}

	return {
		permissions: resolvePermissions(user, currentUser?.id),
		flags: {
			isPending,
			isActivating: activateUser.isPending,
			isSuspending: suspendUser.isPending,
			isPromoting: promoteToAdmin.isPending,
			isDemoting: demoteFromAdmin.isPending,
		},
		errorMessage,
		confirm: {
			suspendOpen,
			promoteOpen,
			demoteOpen,
			setSuspendOpen,
			setPromoteOpen,
			setDemoteOpen,
		},
		onActivate: () => activateUser.mutate(user.id),
		onConfirmSuspend,
		onConfirmPromote,
		onConfirmDemote,
	}
}
```

- **Step 4: Mover os ConfirmationDialogs para módulo próprio**

Crie `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx` copiando os três componentes `SuspendConfirmationDialog`, `PromoteConfirmationDialog` e `DemoteConfirmationDialog` de `user-detail-modal.tsx` (linhas 351-482), exportando-os:

```tsx
"use client"

import type { MouseEvent } from "react"
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

interface SuspendConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isSuspending: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function SuspendConfirmationDialog({
	open,
	onOpenChange,
	isPending,
	isSuspending,
	onConfirm,
}: SuspendConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar inativação</AlertDialogTitle>
					<AlertDialogDescription>
						Tem certeza que deseja inativar este usuário? Ele perderá o acesso
						aos recursos protegidos até ser reativado.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isSuspending}
						>
							{isSuspending ? "Inativando..." : "Confirmar inativação"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

interface PromoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isPromoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function PromoteConfirmationDialog({
	open,
	userName,
	onOpenChange,
	isPending,
	isPromoting,
	onConfirm,
}: PromoteConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Tornar administrador?</AlertDialogTitle>
					<AlertDialogDescription>
						{userName} terá acesso total ao painel administrativo. Esta ação
						pode ser revertida.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isPromoting}
							className="bg-accent text-accent-foreground hover:bg-primary-strong"
						>
							{isPromoting ? "Promovendo..." : "Confirmar"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

interface DemoteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isDemoting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function DemoteConfirmationDialog({
	open,
	userName,
	onOpenChange,
	isPending,
	isDemoting,
	onConfirm,
}: DemoteConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Remover privilégios de admin?</AlertDialogTitle>
					<AlertDialogDescription>
						{userName} perderá acesso ao painel administrativo e voltará a ser
						membro.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isDemoting}
						>
							{isDemoting ? "Removendo..." : "Remover"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "useUserDetailActions"`
Expected: PASS. Se o teste de "próprio usuário" falhar por causa do setter do auth store, ajuste a chamada conforme a API real verificada em `apps/frontend/src/lib/auth/auth-store.ts`.

- **Step 6: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 7: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/
git commit -m "feat(frontend): extract useUserDetailActions hook and confirmation dialogs"
```

## Critérios de Sucesso

- `useUserDetailActions(user)` expõe permissões corretas conforme `status`/`role`/usuário logado (RF-016).
- O hook centraliza `isPending` e flags por ação (RF-018).
- O hook executa activate/suspend/promote/demote chamando os endpoints corretos (RF-014).
- Os três ConfirmationDialogs são exportados de `confirmation-dialogs.tsx`.
- `user-detail-modal.tsx` permanece funcionando (não modificado nesta task).
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
