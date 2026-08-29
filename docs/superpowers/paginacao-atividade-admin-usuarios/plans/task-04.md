# Task 4: Frontend: nova rota `/admin/usuarios/[userId]/atividade`

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/paginacao-atividade-admin-usuarios-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Nova página que exibe o histórico completo de atividades de um usuário, com paginação, espelhando o padrão já usado em `/perfil` (mesmo `ActivityTab`, `NumberedPagination`, hook `useUserActivity`). Segue a convenção de rotas dinâmicas já usada em `admin/` (`useParams`, não `params: Promise<...>`, que é o padrão usado apenas fora de `admin/`). O nome do usuário exibido no cabeçalho vem do hook já existente `useUserById` (`@/features/profile/api`), sem introduzir uma nova abstração de fetch.

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx`

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/paginacao-atividade-admin-usuarios-visual.md` (baseline de layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado (derivado dos tokens reais do tema e da estrutura já existente do card de Atividade em `/perfil`)
- **Confirmar com o usuário:** não há fonte de design externa a confirmar — a tela reaproveita componentes já existentes (`Card`, `ActivityTab`, `NumberedPagination`) sem novo desenho visual
- **Ferramentas de fidelidade visual:** nenhuma configurada neste repo para este tipo de tela; construir diretamente reaproveitando os componentes já existentes (a fidelidade vem do reuso, não de reconstrução)
- **Decisões visuais já tomadas (não refazer):** breadcrumb mono acima do título (`admin / usuários / <nome> / atividade`), `Card` com `rounded-[22px]`, header com título "Histórico de atividades" + pill "20 por página", `ActivityTab` completo + `NumberedPagination` no footer — mesmo arranjo do `/perfil`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: exportar a view (`AdminUserActivityView`) separada do `export default` que lê `useParams` — mesmo padrão já usado em `perfil/[userId]/page.tsx`, permitindo testar a view sem mockar roteamento dinâmico
- `vercel-composition-patterns`: a página é montagem (assembly) de componentes já existentes (`Card`, `ActivityTab`, `NumberedPagination`) — nenhum componente novo com lógica própria
- `shadcn`: `Card`/`CardHeader`/`CardContent`/`CardTitle` seguindo o mesmo uso já validado em `/perfil`
- `tailwindcss`: classes espelhando exatamente as já usadas no header de atividade do `/perfil` (`rounded-[22px]`, `border-border`, etc.)
- `tanstack-query-best-practices`: `useUserActivity(userId, { page })` com `page` vindo da URL (`useSearchParams`), replicando o padrão de paginação via query string já usado em `/perfil`
- `test-antipatterns`: testes via MSW (`server.use`) para os dois endpoints consumidos (`/users/:userId` e `/users/:userId/activity`) — sem mockar os hooks diretamente

## Passos

- **Step 1: Escrever o teste da nova página**

```tsx
// apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

const mockReplace = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => new URLSearchParams(),
}))

import { AdminUserActivityView } from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminUserActivityView", () => {
	test("exibe o nome do usuário no cabeçalho e os eventos retornados", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({
					id: "user-1",
					name: "Maria Souza",
					email: "maria@example.com",
					role: "MEMBER",
				}),
			),
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

		renderWithProviders(<AdminUserActivityView userId="user-1" />)

		expect(await screen.findByText(/maria souza/i)).toBeInTheDocument()
		expect(await screen.findByText("Login realizado")).toBeInTheDocument()
	})

	test("navega para a página seguinte ao clicar na paginação do topo", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({
					id: "user-1",
					name: "Maria Souza",
					email: "maria@example.com",
					role: "MEMBER",
				}),
			),
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
						pagination: { page: 1, pageSize: 20, total: 40, totalPages: 2 },
					},
					{ status: 200 },
				),
			),
		)
		const user = userEvent.setup()

		renderWithProviders(<AdminUserActivityView userId="user-1" />)
		await screen.findByText("Login realizado")

		await user.click(screen.getByRole("link", { name: "2" }))

		expect(mockReplace).toHaveBeenCalledWith("?page=2")
	})
})
```

- **Step 2: Rodar o teste para verificar que falha**

Run (dentro de `apps/frontend`): `npx vitest run "src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx"`
Expected: FAIL — `./page` não existe ainda (erro de módulo não encontrado).

- **Step 3: Criar a página**

```tsx
// apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx
"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"
import { NumberedPagination } from "@/components/ui/numbered-pagination"
import {
	type UserActivityPagination,
	useUserActivity,
} from "@/features/activity/api/use-user-activity"
import { ActivityTab } from "@/features/activity/components/activity-tab"
import { useUserById } from "@/features/profile/api"

function isValidActivityPageParam(pageParam: string | null): boolean {
	const parsedPage = Number(pageParam)
	return Number.isSafeInteger(parsedPage) && parsedPage > 0
}

function getActivityPage(pageParam: string | null): number {
	return isValidActivityPageParam(pageParam) ? Number(pageParam) : 1
}

function shouldShowTopPagination(
	pagination: UserActivityPagination | undefined,
): boolean {
	return !!pagination && pagination.totalPages > 1
}

function getTopActivityPage(
	pagination: UserActivityPagination | undefined,
): number {
	if (!pagination) return 1
	return Math.min(
		Math.max(pagination.page, 1),
		Math.max(pagination.totalPages, 1),
	)
}

function AdminActivityCardHeader({
	pagination,
	isTransitioning,
	onPageChange,
}: {
	pagination: UserActivityPagination | undefined
	isTransitioning: boolean
	onPageChange: (page: number) => void
}) {
	const showTopPagination = shouldShowTopPagination(pagination)
	const topPage = getTopActivityPage(pagination)

	return (
		<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border">
			<CardTitle as="h2">Histórico de atividades</CardTitle>
			<div className="flex flex-wrap items-center gap-3">
				<span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
					20 por página
				</span>
				{showTopPagination ? (
					<NumberedPagination
						page={topPage}
						totalPages={pagination ? pagination.totalPages : 1}
						onChange={onPageChange}
						testIdPrefix="admin-activity-top"
						disabled={isTransitioning}
						className="mx-0 w-auto justify-end"
					/>
				) : null}
			</div>
		</CardHeader>
	)
}

export function AdminUserActivityView({ userId }: { userId: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const page = getActivityPage(searchParams.get("page"))

	const { data: targetUser } = useUserById(userId)
	const {
		data: activityData,
		isLoading: isActivityLoading,
		isError: isActivityError,
		isFetching: isActivityFetching,
		isPlaceholderData: isActivityPlaceholderData,
	} = useUserActivity(userId, { page })

	function handlePageChange(nextPage: number) {
		const nextParams = new URLSearchParams(searchParams.toString())
		nextParams.set("page", String(nextPage))
		router.replace(`?${nextParams.toString()}`)
	}

	return (
		<PageContainer width="default" className="gap-6">
			<div>
				<Link
					href="/admin/usuarios"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para usuários
				</Link>
			</div>
			<header className="flex flex-col gap-1">
				<Eyebrow>
					admin / usuários / {targetUser?.name ?? userId} / atividade
				</Eyebrow>
				<h1 className="font-display text-3xl font-semibold text-foreground">
					Histórico de atividades
				</h1>
			</header>

			<Card className="w-full gap-0 rounded-[22px]">
				<AdminActivityCardHeader
					pagination={activityData?.pagination}
					isTransitioning={isActivityFetching || isActivityPlaceholderData}
					onPageChange={handlePageChange}
				/>
				<CardContent className="pt-6">
					<ActivityTab
						events={activityData?.events}
						pagination={activityData?.pagination}
						onPageChange={handlePageChange}
						isLoading={isActivityLoading}
						isError={isActivityError}
						isFetching={isActivityFetching}
						isPlaceholderData={isActivityPlaceholderData}
					/>
				</CardContent>
			</Card>
		</PageContainer>
	)
}

export default function AdminUserActivityPage() {
	const params = useParams<{ userId: string }>()
	const userId = params?.userId
	if (!userId) return null
	return <AdminUserActivityView userId={userId} />
}
```

- **Step 4: Rodar o teste para verificar que passa**

Run (dentro de `apps/frontend`): `npx vitest run "src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx"`
Expected: PASS — os dois testes do arquivo.

- **Step 5: Commit**

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.tsx" \
  "apps/frontend/src/app/(authenticated)/admin/usuarios/[userId]/atividade/page.test.tsx"
git commit -m "feat(activity): cria tela de historico completo de atividade no admin"
```

## Critérios de Sucesso

- `/admin/usuarios/{userId}/atividade` exibe o nome do usuário no cabeçalho e a lista completa de eventos, paginada (20 por página), usando `ActivityTab` + `NumberedPagination`.
- Trocar de página atualiza a URL (`?page=`) via `router.replace`, mesmo padrão do `/perfil`.
- A rota segue a convenção `useParams` já usada em outras rotas dinâmicas de `admin/`.
