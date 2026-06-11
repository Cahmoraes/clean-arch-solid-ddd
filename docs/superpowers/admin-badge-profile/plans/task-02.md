# Task 2: Integrar AdminBadge na página de perfil

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/admin-badge-profile-design.md`

## Visão Geral

Modificar `ProfilePage` para exibir o `AdminBadge` ao lado do título "Meu perfil" quando o usuário logado tiver `role === 'ADMIN'`. A role é lida diretamente do `useAuthStore` (Zustand, síncrono — sem loading state). O badge não é exibido para usuários com `role === 'MEMBER'`.

**Pré-requisito:** Task 1 concluída (`AdminBadge` existe em `src/components/ui/admin-badge.tsx`).

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/perfil/page.tsx`

### Conformidade com as Skills Padrão

- test-driven-development: escrever testes de integração antes de modificar a página
- test-antipatterns: usar `useAuthStore.setState()` para setar estado real do Zustand (não mockar o módulo)

## Passos

- [ ] **Step 1: Escrever os testes com falha**

Crie o arquivo `apps/frontend/src/app/(authenticated)/perfil/page.test.tsx` com o seguinte conteúdo:

```tsx
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it } from "vitest"

import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import ProfilePage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function mockProfileApis() {
	server.use(
		http.get(`${apiBaseUrl}/users/me`, () =>
			HttpResponse.json(
				{
					id: "user-1",
					name: "Admin User",
					email: "admin@email.com",
					hasPassword: true,
				},
				{ status: 200 },
			),
		),
		http.get(`${apiBaseUrl}/users/me/metrics`, () =>
			HttpResponse.json({ checkInsCount: 5 }, { status: 200 }),
		),
	)
}

describe("ProfilePage — AdminBadge", () => {
	beforeEach(() => {
		mockProfileApis()
	})

	it("exibe o badge ADMIN quando o usuário é administrador", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "ADMIN" },
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByText("ADMIN")).toBeInTheDocument()
		})
	})

	it("não exibe o badge ADMIN quando o usuário é membro", async () => {
		useAuthStore.setState({
			accessToken: "fake",
			expiresAt: Date.now() + 60_000,
			user: { id: "user-1", role: "MEMBER" },
		})

		renderWithProviders(<ProfilePage />)

		await waitFor(() => {
			expect(screen.getByTestId("profile-data")).toBeInTheDocument()
		})
		expect(screen.queryByText("ADMIN")).not.toBeInTheDocument()
	})
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- -t "ProfilePage — AdminBadge"
```

Saída esperada: **FAIL** — `Unable to find an element with the text: ADMIN` (ou similar, pois o badge ainda não foi adicionado à página).

- [ ] **Step 3: Modificar `ProfilePage` para exibir o badge**

No arquivo `apps/frontend/src/app/(authenticated)/perfil/page.tsx`:

**3a. Adicionar os imports** no topo do arquivo (após os imports existentes):

```tsx
import { useAuthStore } from "@/lib/auth/auth-store"
import { AdminBadge } from "@/components/ui/admin-badge"
```

**3b. Adicionar a leitura do role** dentro do componente `ProfilePage`, logo após a linha `const { data, isLoading, isError, refetch, isFetching } = useMe()`:

```tsx
const { user } = useAuthStore()
const isAdmin = user?.role === "ADMIN"
```

**3c. Substituir o `<header>`** existente:

Antes:
```tsx
<header className="flex flex-col gap-2">
  <h1 className="font-display text-3xl font-semibold text-foreground">
    Meu perfil
  </h1>
  <p className="text-sm text-muted-foreground">
    Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
  </p>
</header>
```

Depois:
```tsx
<header className="flex flex-col gap-2">
  <div className="flex items-center gap-3">
    <h1 className="font-display text-3xl font-semibold text-foreground">
      Meu perfil
    </h1>
    {isAdmin && <AdminBadge />}
  </div>
  <p className="text-sm text-muted-foreground">
    Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
  </p>
</header>
```

O arquivo final de `apps/frontend/src/app/(authenticated)/perfil/page.tsx` deverá ter este conteúdo completo:

```tsx
"use client"

import { Activity, KeyRound, UserCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminBadge } from "@/components/ui/admin-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/lib/auth/auth-store"
import { type Me, useMe, useMetrics } from "@/features/profile/api"

interface ProfileSectionProps {
	data: Me | undefined
	isError: boolean
	isFetching: boolean
	isLoading: boolean
	onRetry: () => void
}

function ProfileSection({
	data,
	isError,
	isFetching,
	isLoading,
	onRetry,
}: ProfileSectionProps) {
	if (isLoading) {
		return (
			<div data-testid="profile-skeleton" className="flex flex-col gap-3">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-64" />
				<Skeleton className="h-4 w-32" />
			</div>
		)
	}

	if (isError || !data) {
		return (
			<EmptyState
				icon={UserCircle}
				title="Não foi possível carregar seu perfil"
				description="Verifique sua conexão e tente novamente."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={onRetry}
						data-testid="profile-retry"
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		)
	}

	return (
		<dl data-testid="profile-data" className="grid gap-4 sm:grid-cols-2">
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">Nome</dt>
				<dd
					data-testid="profile-name"
					className="text-base font-medium text-foreground"
				>
					{data.name}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">E-mail</dt>
				<dd
					data-testid="profile-email"
					className="text-base font-medium text-foreground"
				>
					{data.email}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">ID</dt>
				<dd
					data-testid="profile-id"
					className="text-base font-mono text-foreground"
				>
					{data.id}
				</dd>
			</div>
		</dl>
	)
}

function MetricsSection() {
	const { data, isLoading, isError, refetch, isFetching } = useMetrics()

	if (isLoading) {
		return (
			<div data-testid="metrics-skeleton" className="flex gap-4">
				<Skeleton className="h-24 w-40" />
			</div>
		)
	}

	if (isError || !data) {
		return (
			<EmptyState
				icon={Activity}
				title="Não foi possível carregar suas métricas"
				description="Tente novamente em instantes."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={() => refetch()}
						data-testid="metrics-retry"
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		)
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div
				data-testid="metric-checkins"
				className="flex flex-col gap-2 rounded-[12px] border border-border bg-card p-5"
			>
				<span className="text-sm text-muted-foreground">
					Total de check-ins
				</span>
				<span className="font-display text-3xl font-semibold text-foreground">
					{data.checkInsCount}
				</span>
			</div>
		</div>
	)
}

export default function ProfilePage() {
	const { data, isLoading, isError, refetch, isFetching } = useMe()
	const { user } = useAuthStore()
	const isAdmin = user?.role === "ADMIN"
	const passwordActionLabel =
		data?.hasPassword === false ? "Definir senha" : "Alterar senha"

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<h1 className="font-display text-3xl font-semibold text-foreground">
						Meu perfil
					</h1>
					{isAdmin && <AdminBadge />}
				</div>
				<p className="text-sm text-muted-foreground">
					Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
				</p>
			</header>

			<section
				aria-labelledby="profile-section-title"
				className="flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6"
			>
				<div className="flex items-center justify-between gap-4">
					<h2
						id="profile-section-title"
						className="font-display text-xl font-medium text-foreground"
					>
						Dados pessoais
					</h2>
					<Button asChild variant="secondary">
						<Link
							href="/perfil/senha"
							data-testid="profile-change-password-link"
							className="inline-flex items-center gap-2"
						>
							<KeyRound className="h-4 w-4" />
							{passwordActionLabel}
						</Link>
					</Button>
				</div>
				<ProfileSection
					data={data}
					isError={isError}
					isFetching={isFetching}
					isLoading={isLoading}
					onRetry={() => {
						void refetch()
					}}
				/>
			</section>

			<section
				aria-labelledby="metrics-section-title"
				className="flex flex-col gap-4"
			>
				<h2
					id="metrics-section-title"
					className="font-display text-xl font-medium text-foreground"
				>
					Métricas
				</h2>
				<MetricsSection />
			</section>
		</main>
	)
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "ProfilePage — AdminBadge"
```

Saída esperada: **PASS** — 2 testes passando.

- [ ] **Step 5: Rodar todos os testes do frontend para garantir que nada quebrou**

```bash
pnpm --filter frontend test
```

Saída esperada: todos os testes passando (sem regressões).

- [ ] **Step 6: Verificar TypeScript e lint**

```bash
pnpm --filter frontend tsc:check && pnpm --filter frontend lint:fix
```

Saída esperada: sem erros de tipo, zero issues do Biome.

- [ ] **Step 7: Verificar build de produção**

```bash
pnpm --filter frontend build
```

Saída esperada: build concluído sem erros.

- [ ] **Step 8: Commit**

```bash
cd apps/frontend
git add src/app/(authenticated)/perfil/page.tsx \
        src/app/(authenticated)/perfil/page.test.tsx
git commit -m "feat(frontend): show admin badge on profile page

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Badge "ADMIN" visível ao lado de "Meu perfil" quando `role === 'ADMIN'` ✅
- Badge ausente quando `role === 'MEMBER'` ✅
- `pnpm --filter frontend test -- -t "ProfilePage — AdminBadge"` passa com 2 testes ✅
- `pnpm --filter frontend test` sem regressões ✅
- `pnpm --filter frontend tsc:check` sem erros ✅
- `pnpm --filter frontend lint:fix` zero issues ✅
- `pnpm --filter frontend build` sem erros ✅
