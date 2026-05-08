# Task 13: Página /check-ins — botões admin inline [RF-006, RF-007, RF-008, RF-016, RF-017]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar a página de histórico do usuário (`/check-ins`) para detectar se o utilizador atual é admin (via `useAuthStore`) e, se for, passar o componente `<CheckInActions>` como `action` prop para cada `CheckInItem`. Para usuários não-admin, nenhuma ação é exibida — comportamento idêntico ao atual.

**Depende de:** Task 12

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`

## Passos

- [ ] **Step 1: Atualizar página /check-ins**

```typescript
// apps/frontend/src/app/(authenticated)/check-ins/page.tsx
"use client"

import { CalendarCheck } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
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
	CHECK_INS_DEFAULT_PAGE_SIZE,
	type CheckIn,
	useCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { useAuthStore } from "@/lib/auth/auth-store"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4"]

function LoadingState() {
	return (
		<ul
			data-testid="checkins-skeleton"
			aria-label="Carregando check-ins"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full rounded-[12px]" />
				</li>
			))}
		</ul>
	)
}

function totalPages(total: number, pageSize: number): number {
	if (total <= 0) return 0
	return Math.max(1, Math.ceil(total / pageSize))
}

interface ListProps {
	items: ReadonlyArray<CheckIn>
	isAdmin: boolean
}

function CheckInsList({ items, isAdmin }: ListProps) {
	return (
		<ul data-testid="checkins-list" className="flex flex-col gap-2">
			{items.map((checkIn) => (
				<CheckInItem
					key={checkIn.id}
					checkIn={checkIn}
					action={isAdmin ? <CheckInActions checkIn={checkIn} /> : undefined}
				/>
			))}
		</ul>
	)
}

interface PagerProps {
	page: number
	pages: number
	onChange: (next: number) => void
}

function CheckInsPager({ page, pages, onChange }: PagerProps) {
	if (pages <= 1) return null
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						data-testid="checkins-prev"
						aria-disabled={page <= 1}
						onClick={(event) => {
							event.preventDefault()
							if (page > 1) onChange(page - 1)
						}}
					/>
				</PaginationItem>
				<PaginationItem>
					<PaginationLink isActive>{page}</PaginationLink>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						data-testid="checkins-next"
						aria-disabled={page >= pages}
						onClick={(event) => {
							event.preventDefault()
							if (page < pages) onChange(page + 1)
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}

interface BodyProps {
	query: ReturnType<typeof useCheckIns>
	isAdmin: boolean
}

function HistoryError({ query }: Omit<BodyProps, "isAdmin">) {
	return (
		<EmptyState
			title="Não foi possível carregar seu histórico"
			description={query.error?.userMessage}
			action={
				<Button
					variant="outline"
					onClick={() => query.refetch()}
					data-testid="checkins-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function HistoryEmpty() {
	return (
		<EmptyState
			icon={CalendarCheck}
			title="Você ainda não fez check-in"
			description="Procure uma academia próxima e registre sua presença."
		/>
	)
}

function CheckInsBody({ query, isAdmin }: BodyProps) {
	if (query.isLoading) return <LoadingState />
	if (query.isError) return <HistoryError query={query} />
	if (!query.isSuccess) return null
	const items = query.data?.items ?? []
	if (items.length === 0) return <HistoryEmpty />
	return <CheckInsList items={items} isAdmin={isAdmin} />
}

export default function CheckInsPage() {
	const [page, setPage] = useState(1)
	const user = useAuthStore((state) => state.user)
	const isAdmin = user?.role === "ADMIN"
	const query = useCheckIns({ page })
	const pages = totalPages(query.data?.total ?? 0, CHECK_INS_DEFAULT_PAGE_SIZE)

	return (
		<section
			aria-labelledby="checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-1">
				<h1
					id="checkins-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Histórico de check-ins
				</h1>
				<p className="text-sm text-muted-foreground">
					Acompanhe sua frequência nas academias.
				</p>
			</header>

			<CheckInsBody query={query} isAdmin={isAdmin} />

			<CheckInsPager page={page} pages={pages} onChange={setPage} />
		</section>
	)
}
```

- [ ] **Step 2: Type-check do frontend**

```bash
pnpm --filter frontend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 3: Rodar testes do frontend**

```bash
pnpm --filter frontend test
```

Esperado: todos passam.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/(authenticated)/check-ins/page.tsx
git commit -m "feat(frontend): show admin check-in actions in /check-ins page

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Admin vê `CheckInActions` em cada item (`Aprovar`/`Rejeitar` conforme status)
- Não-admin vê apenas o badge de status (sem botões), comportamento idêntico ao atual
- `useAuthStore` detecta `user.role === "ADMIN"` para decisão
- 0 erros de TypeScript
- Todos os testes existentes continuam passando
