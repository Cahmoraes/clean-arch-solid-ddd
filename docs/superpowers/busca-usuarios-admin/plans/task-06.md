# Task 6: Frontend — AdminUsersPage UI de busca

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Adicionar o campo de busca na página `/admin/usuarios`. O campo é um `<Input>` shadcn com debounce de 500ms. Quando o valor debounced muda, a paginação reseta para a página 1 e o `useUsers()` é chamado com o novo `query`. Quando o campo está vazio, o comportamento é idêntico ao original.

**Pré-requisito:** Task 5 concluída (`useUsers` aceita `query`; `useDebounce` disponível).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`

## Conformidade com as Competências Padrão

- `test-driven-development`: escrever testes antes de modificar a página
- `react`: `useEffect` com cleanup; estado controlado no input
- `shadcn`: usar componente `Input` de `@/components/ui/input`

## Passos

- [ ] **Step 1: Escrever os novos testes de UI**

Abrir `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx` e adicionar os seguintes testes ao final do describe existente:

```typescript
test("renderiza o campo de busca na página", async () => {
  mockUsersList()
  renderPage()

  const searchInput = await screen.findByTestId("admin-users-search")
  expect(searchInput).toBeInTheDocument()
  expect(searchInput).toHaveAttribute("placeholder", "Buscar por nome ou e-mail...")
})

test("lista todos usuários quando campo de busca está vazio", async () => {
  mockUsersList([buildUser(), buildUser({ id: "user-2", name: "Carlos Lima", email: "carlos@example.com" })])
  renderPage()

  await waitFor(() => {
    expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
  })
  expect(screen.getByTestId("admin-users-list").children).toHaveLength(2)
})

test("chama API com query param após digitar no campo de busca", async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  let receivedQuery: string | null = null

  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      receivedQuery = url.searchParams.get("query")
      return HttpResponse.json(
        { users: [buildUser()], pagination: { page: 1, limit: 10, total: 1 } },
        { status: 200 },
      )
    }),
  )

  renderPage()
  const searchInput = await screen.findByTestId("admin-users-search")
  await user.type(searchInput, "ana")

  await act(async () => {
    vi.advanceTimersByTime(500)
  })

  await waitFor(() => {
    expect(receivedQuery).toBe("ana")
  })

  vi.useRealTimers()
})

test("não dispara busca antes do debounce de 500ms", async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  let callCount = 0

  server.use(
    http.get(`${apiBaseUrl}/users`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get("query")) callCount++
      return HttpResponse.json(
        { users: [], pagination: { page: 1, limit: 10, total: 0 } },
        { status: 200 },
      )
    }),
  )

  renderPage()
  const searchInput = await screen.findByTestId("admin-users-search")
  await user.type(searchInput, "a")

  await act(async () => {
    vi.advanceTimersByTime(400)
  })

  expect(callCount).toBe(0)

  vi.useRealTimers()
})
```

Adicionar o import de `vi` e `act` ao topo do arquivo (junto com os imports existentes):

```typescript
import { act } from "@testing-library/react"
import { vi } from "vitest"
```

- [ ] **Step 2: Rodar os novos testes para confirmar que falham**

```bash
pnpm --filter frontend test -- -t "renderiza o campo de busca"
```

Resultado esperado: `FAIL` (campo de busca ainda não existe na página).

- [ ] **Step 3: Verificar que `Input` está disponível em `@/components/ui/input`**

```bash
ls apps/frontend/src/components/ui/input.tsx
```

Resultado esperado: arquivo existe. Se não existir, instalar via shadcn:

```bash
cd apps/frontend && npx shadcn@latest add input
```

- [ ] **Step 4: Atualizar a página `AdminUsersPage`**

Substituir o conteúdo de `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`:

```typescript
"use client"

import { Users } from "lucide-react"
import type { MouseEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
	ADMIN_USERS_DEFAULT_LIMIT,
	type AdminUser,
	useUsers,
} from "@/features/admin/api/use-users"
import { UserDetailModal } from "@/features/admin/components/user-detail-modal"
import { UserRow } from "@/features/admin/components/user-row"
import { useDebounce } from "@/hooks/use-debounce"
import type { ApiError } from "@/lib/errors"

const SKELETON_ROWS = 5
const SKELETON_KEYS = Array.from(
	{ length: SKELETON_ROWS },
	(_, idx) => `sk-${idx}`,
)

function clampPage(page: number, totalPages: number): number {
	if (totalPages <= 0) return 1
	if (page < 1) return 1
	if (page > totalPages) return totalPages
	return page
}

function pageNumbers(currentPage: number, totalPages: number): number[] {
	if (totalPages <= 0) return []
	const max = Math.min(totalPages, 5)
	const start = Math.max(1, Math.min(currentPage - 2, totalPages - max + 1))
	return Array.from({ length: max }, (_, idx) => start + idx)
}

function LoadingState() {
	return (
		<ul
			data-testid="admin-users-skeleton"
			aria-label="Carregando usuários"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full" />
				</li>
			))}
		</ul>
	)
}

function ErrorState({ error }: { error: ApiError | null }) {
	return (
		<div
			data-testid="admin-users-error"
			role="alert"
			className="rounded-[12px] border border-border bg-accent px-4 py-6 text-sm text-foreground"
		>
			{error?.userMessage ??
				"Não foi possível carregar a lista de usuários. Tente novamente."}
		</div>
	)
}

function UsersEmpty() {
	return (
		<EmptyState
			icon={Users}
			title="Nenhum usuário cadastrado"
			description="Quando novas contas forem criadas, elas aparecerão aqui."
		/>
	)
}

interface UsersPaginationProps {
	page: number
	totalPages: number
	onChange: (target: number) => void
}

function UsersPagination({ page, totalPages, onChange }: UsersPaginationProps) {
	function handlePrev(event: MouseEvent) {
		event.preventDefault()
		if (page > 1) onChange(page - 1)
	}
	function handleNext(event: MouseEvent) {
		event.preventDefault()
		if (page < totalPages) onChange(page + 1)
	}
	function handleSelect(event: MouseEvent, target: number) {
		event.preventDefault()
		onChange(target)
	}
	return (
		<Pagination data-testid="admin-users-pagination">
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="admin-users-prev"
						aria-disabled={page <= 1}
						onClick={handlePrev}
					/>
				</PaginationItem>
				{pageNumbers(page, totalPages).map((p) => (
					<PaginationItem key={p}>
						<PaginationLink
							data-testid={`admin-users-page-${p}`}
							isActive={p === page}
							onClick={(event) => handleSelect(event, p)}
						>
							{p}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						data-testid="admin-users-next"
						aria-disabled={page >= totalPages}
						onClick={handleNext}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}

interface UsersListProps {
	users: ReadonlyArray<AdminUser>
	page: number
	totalPages: number
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersList({
	users,
	page,
	totalPages,
	onPageChange,
	onSelect,
}: UsersListProps) {
	return (
		<>
			<ul data-testid="admin-users-list" className="flex flex-col gap-2">
				{users.map((user) => (
					<UserRow key={user.id} user={user} onSelect={onSelect} />
				))}
			</ul>
			{totalPages > 1 ? (
				<UsersPagination
					page={page}
					totalPages={totalPages}
					onChange={onPageChange}
				/>
			) : null}
		</>
	)
}

interface UsersContentProps {
	isLoading: boolean
	isError: boolean
	error: ApiError | null
	users: ReadonlyArray<AdminUser> | undefined
	page: number
	totalPages: number
	onPageChange: (target: number) => void
	onSelect: (user: AdminUser) => void
}

function UsersContent({
	isLoading,
	isError,
	error,
	users,
	page,
	totalPages,
	onPageChange,
	onSelect,
}: UsersContentProps) {
	if (isLoading) return <LoadingState />
	if (isError) return <ErrorState error={error} />
	if (!users) return null
	if (users.length === 0) return <UsersEmpty />
	return (
		<UsersList
			users={users}
			page={page}
			totalPages={totalPages}
			onPageChange={onPageChange}
			onSelect={onSelect}
		/>
	)
}

export default function AdminUsersPage() {
	const [page, setPage] = useState(1)
	const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
	const [inputQuery, setInputQuery] = useState("")
	const debouncedQuery = useDebounce(inputQuery, 500)
	const limit = ADMIN_USERS_DEFAULT_LIMIT

	useEffect(() => {
		setPage(1)
	}, [debouncedQuery])

	const { data, isLoading, isError, error, isFetching } = useUsers({
		page,
		limit,
		query: debouncedQuery || undefined,
	})

	const totalPages = useMemo(() => {
		if (!data) return 0
		return Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit))
	}, [data])
	const activeSelectedUser = useMemo(() => {
		if (!selectedUser) return null
		return (
			data?.users.find((user) => user.id === selectedUser.id) ?? selectedUser
		)
	}, [data?.users, selectedUser])

	function handlePageChange(target: number) {
		setPage((current) => clampPage(target, Math.max(totalPages, current)))
		setSelectedUser(null)
	}

	function handleUserSelect(user: AdminUser) {
		setSelectedUser(user)
	}

	function handleModalClose() {
		setSelectedUser(null)
	}

	return (
		<section
			data-testid="admin-users-page"
			className="flex flex-col gap-8"
			aria-busy={isFetching}
		>
			<header className="flex flex-col gap-2">
				<h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
					Usuários
				</h1>
				<p className="text-sm text-muted-foreground">
					Visualize todas as contas cadastradas na plataforma.
				</p>
				<Input
					data-testid="admin-users-search"
					type="search"
					placeholder="Buscar por nome ou e-mail..."
					value={inputQuery}
					onChange={(e) => setInputQuery(e.target.value)}
					className="max-w-sm"
				/>
			</header>

			<UsersContent
				isLoading={isLoading}
				isError={isError}
				error={error ?? null}
				users={data?.users}
				page={page}
				totalPages={totalPages}
				onPageChange={handlePageChange}
				onSelect={handleUserSelect}
			/>

			{activeSelectedUser ? (
				<UserDetailModal
					user={activeSelectedUser}
					open={activeSelectedUser !== null}
					onClose={handleModalClose}
				/>
			) : null}
		</section>
	)
}
```

**Nota sobre `query: debouncedQuery || undefined`:** quando o campo está vazio, `debouncedQuery` é `""`. A expressão `"" || undefined` resulta em `undefined`, garantindo que a chamada HTTP não envie `?query=` e o comportamento seja idêntico ao original.

- [ ] **Step 5: Rodar todos os testes da página para confirmar que passam**

```bash
pnpm --filter frontend test -- -t "AdminUsersPage"
```

Resultado esperado: todos os testes (existentes + novos) passando.

- [ ] **Step 6: Verificar TypeScript e lint**

```bash
pnpm --filter frontend tsc:check && pnpm --filter frontend lint:fix
```

Resultado esperado: zero erros.

- [ ] **Step 7: Rodar toda a suíte de testes do frontend**

```bash
pnpm --filter frontend test
```

Resultado esperado: todos os testes passando.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx apps/frontend/src/app/\(authenticated\)/admin/usuarios/admin-users-page.test.tsx && git commit -m "feat(frontend): adiciona campo de busca por nome/email na página de usuários admin

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Campo `<Input>` com `data-testid="admin-users-search"` e placeholder correto é renderizado
- Digitação aciona debounce de 500ms antes de disparar a busca
- Paginação reseta para página 1 quando `debouncedQuery` muda
- Campo vazio = `query: undefined` = nenhum filtro ativo (comportamento original)
- Todos os testes existentes e novos passam
- `tsc:check` e `lint:fix` passam sem erros
