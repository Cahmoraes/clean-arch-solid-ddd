# Task 8: `UserDetailContainer` responsivo (split-view vs Dialog + EmptyState) [RF-001, RF-002, RF-003, RF-006, RF-021]

**Status:** DONE
**PRD:** `../prd/prd-admin-user-detail-panel.md`
**Spec:** `../specs/admin-user-detail-panel-design.md`
**Depends on:** task-01, task-07

## Visão Geral

Cria o container responsivo que decide, via `useIsDesktop` (task 1), como apresentar o `UserDetailPanel` (task 7): no desktop renderiza o painel diretamente numa coluna (ou um `EmptyState` quando nenhum usuário está selecionado); no mobile renderiza o painel dentro de um `Dialog` (shadcn), que provê foco preso e fechamento por `Esc`/backdrop.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx`

### Conformidade com as Skills Padrão

- use react skill + shadcn skill: Dialog, EmptyState, renderização condicional
- use vercel-composition-patterns skill: container vs apresentação
- use test-antipatterns skill + vitest skill: mock do hook responsivo, testes de ambos os modos

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserDetailContainer } from "./user-detail-container"

const isDesktopMock = vi.fn<() => boolean>()
vi.mock("@/lib/hooks/use-is-desktop", () => ({
	useIsDesktop: () => isDesktopMock(),
}))

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

function renderContainer(user: AdminUser | null) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return render(
		<UserDetailContainer user={user} onClose={vi.fn()} onEdit={vi.fn()} />,
		{ wrapper },
	)
}

beforeEach(() => {
	isDesktopMock.mockReset()
})

describe("UserDetailContainer", () => {
	test("no desktop sem usuário, exibe estado vazio", () => {
		isDesktopMock.mockReturnValue(true)
		renderContainer(null)
		expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
	})

	test("no desktop com usuário, renderiza o painel sem dialog", () => {
		isDesktopMock.mockReturnValue(true)
		renderContainer(buildUser())
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	test("no mobile com usuário, renderiza o painel dentro de um dialog", () => {
		isDesktopMock.mockReturnValue(false)
		renderContainer(buildUser())
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(screen.getByText("João Damasio")).toBeInTheDocument()
	})

	test("no mobile sem usuário, não renderiza dialog", () => {
		isDesktopMock.mockReturnValue(false)
		renderContainer(null)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test -- -t "UserDetailContainer"`
Expected: FAIL — `Failed to resolve import "./user-detail-container"`.

- **Step 3: Implementar o `UserDetailContainer`**

Crie `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`:

```tsx
"use client"

import { UserRound } from "lucide-react"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"
import { UserDetailPanel } from "./user-detail-panel"

export interface UserDetailContainerProps {
	user: AdminUser | null
	onClose: () => void
	onEdit: (user: AdminUser) => void
}

export function UserDetailContainer({
	user,
	onClose,
	onEdit,
}: UserDetailContainerProps) {
	const isDesktop = useIsDesktop()

	if (isDesktop) {
		if (!user) {
			return (
				<EmptyState
					icon={UserRound}
					title="Selecione um usuário"
					description="Escolha um usuário na lista para ver os detalhes."
				/>
			)
		}
		return (
			<div className="rounded-lg border border-border bg-card p-5">
				<UserDetailPanel user={user} onEdit={() => onEdit(user)} />
			</div>
		)
	}

	return (
		<Dialog
			open={user !== null}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
		>
			<DialogContent className="max-w-2xl">
				<DialogHeader className="sr-only">
					<DialogTitle>Detalhes do usuário</DialogTitle>
					<DialogDescription>
						Visualize os dados da conta e execute ações administrativas.
					</DialogDescription>
				</DialogHeader>
				{user ? (
					<UserDetailPanel user={user} onEdit={() => onEdit(user)} />
				) : null}
			</DialogContent>
		</Dialog>
	)
}
```

> Verifique o ícone `UserRound` em `lucide-react` (substitua por `Users` se preferir, já usado no projeto). O `DialogHeader` com `sr-only` mantém acessibilidade (título exigido pelo Radix Dialog) sem duplicar o cabeçalho visual do painel.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "UserDetailContainer"`
Expected: PASS — 4 testes passam.

- **Step 5: Lint + tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx
git commit -m "feat(frontend): add responsive UserDetailContainer (split-view vs dialog)"
```

## Critérios de Sucesso

- Desktop com usuário: painel em coluna, sem Dialog (RF-002).
- Desktop sem usuário: EmptyState orientando seleção (RF-006).
- Mobile com usuário: painel dentro de Dialog acessível, foco preso e `Esc` (RF-003, RF-021).
- Abertura do painel ocorre ao haver usuário selecionado (RF-001).
- `pnpm --filter frontend test`, `lint:fix` e `tsc:check` passam.
