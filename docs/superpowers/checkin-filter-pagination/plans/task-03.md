# Task 3: Tela de check-ins do usuário — integrar filtro e paginação via URL [RF-004, RF-005, RF-008, RF-009, RF-014]

**Status:** DONE
**PRD:** `../prd/prd-checkin-filter-pagination.md`
**Spec:** `../specs/checkin-filter-pagination-design.md`

## Visão Geral

Atualizar `apps/frontend/src/app/(authenticated)/check-ins/page.tsx` para:
1. Usar `useCheckInFilters()` no lugar do `useState(1)` para gerenciar `page` e `status` via URL.
2. Renderizar `CheckInFilterBar` acima da lista.
3. Passar `status` para `useMyCheckIns`.
4. Tornar o `HistoryEmpty` contextual ao filtro ativo.
5. Envolver o conteúdo da página em `<Suspense>` (obrigatório para `useSearchParams` no Next.js App Router).

**Contexto do código atual:**
- `useState(1)` gerencia `page`
- `useMyCheckIns({ page })` busca os dados (sem `status`)
- `CheckInsPager` já existe e recebe `onChange: (next: number) => void`
- `HistoryEmpty` mostra mensagem fixa sem considerar filtro
- `CHECK_INS_DEFAULT_PAGE_SIZE = 20` importado de `@/features/check-ins/api`

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Create: `apps/frontend/src/app/(authenticated)/check-ins/page.test.tsx`

### Conformidade com as Skills Padrão

- test-driven-development: escrever testes antes de modificar a página
- react: Suspense boundary para `useSearchParams`
- next-best-practices: `useSearchParams` requer `<Suspense>` no App Router

## Passos

- [ ] **Step 1: Criar o arquivo de teste**

```tsx
// apps/frontend/src/app/(authenticated)/check-ins/page.test.tsx
import { render, screen } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECK_INS_DEFAULT_PAGE_SIZE, useMyCheckIns } from '@/features/check-ins/api'
import CheckInsPage from './page.js'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('@/features/check-ins/api', () => ({
  useMyCheckIns: vi.fn(),
  CHECK_INS_DEFAULT_PAGE_SIZE: 20,
}))

const mockQuerySuccess = (items = [], total = 0) => ({
  isLoading: false,
  isError: false,
  isSuccess: true,
  data: { items, total, page: 1 },
  error: null,
  refetch: vi.fn(),
})

describe('CheckInsPage', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as ReturnType<typeof useSearchParams>)
    vi.mocked(useMyCheckIns).mockReturnValue(mockQuerySuccess() as ReturnType<typeof useMyCheckIns>)
  })

  it('renders the filter bar with all 4 pills', () => {
    render(<CheckInsPage />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitados' })).toBeInTheDocument()
  })

  it('calls useMyCheckIns with status from URL params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending&page=2') as ReturnType<typeof useSearchParams>)
    render(<CheckInsPage />)
    expect(vi.mocked(useMyCheckIns)).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', page: 2 }),
    )
  })

  it('shows default empty state when no filter is active and list is empty', () => {
    render(<CheckInsPage />)
    expect(screen.getByText('Você ainda não fez check-in')).toBeInTheDocument()
  })

  it('shows contextual empty state when filter is active and list is empty', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending') as ReturnType<typeof useSearchParams>)
    render(<CheckInsPage />)
    expect(screen.getByText('Nenhum check-in pendente encontrado')).toBeInTheDocument()
  })

  it('shows contextual empty state for validated filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=validated') as ReturnType<typeof useSearchParams>)
    render(<CheckInsPage />)
    expect(screen.getByText('Nenhum check-in aprovado encontrado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- "check-ins/page"
```

Esperado: falha — os testes de filter bar e empty state contextual não passam ainda

- [ ] **Step 3: Atualizar a página**

Substituir o conteúdo de `apps/frontend/src/app/(authenticated)/check-ins/page.tsx` pelo seguinte:

```tsx
// apps/frontend/src/app/(authenticated)/check-ins/page.tsx
'use client'

import { CalendarCheck } from 'lucide-react'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CHECK_INS_DEFAULT_PAGE_SIZE,
  useMyCheckIns,
} from '@/features/check-ins/api'
import { CheckInFilterBar } from '@/features/check-ins/components/check-in-filter-bar.js'
import { CheckInActions } from '@/features/check-ins/components/check-in-actions'
import { CheckInItem } from '@/features/check-ins/components/check-in-item'
import {
  type CheckInFilterStatus,
  useCheckInFilters,
} from '@/features/check-ins/hooks/use-check-in-filters.js'
import { useAuthStore } from '@/lib/auth/auth-store'

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4']

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
  items: ReadonlyArray<{
    id: string
    gymId: string
    gymTitle?: string | null
    validatedAt: string | null
    rejectedAt: string | null
    status: 'pending' | 'validated' | 'rejected'
    createdAt: string
  }>
}

function CheckInsList({ items }: ListProps) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'ADMIN'

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

const STATUS_LABELS: Record<NonNullable<CheckInFilterStatus>, string> = {
  pending: 'pendente',
  validated: 'aprovado',
  rejected: 'rejeitado',
}

function HistoryEmpty({ status }: { status: CheckInFilterStatus }) {
  if (!status) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Você ainda não fez check-in"
        description="Procure uma academia próxima e registre sua presença."
      />
    )
  }
  return (
    <EmptyState
      icon={CalendarCheck}
      title={`Nenhum check-in ${STATUS_LABELS[status]} encontrado`}
      description="Tente selecionar outro filtro."
    />
  )
}

interface BodyProps {
  query: ReturnType<typeof useMyCheckIns>
  status: CheckInFilterStatus
}

function HistoryError({ query }: Pick<BodyProps, 'query'>) {
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

function CheckInsBody({ query, status }: BodyProps) {
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <HistoryError query={query} />
  if (!query.isSuccess) return null
  const items = query.data?.items ?? []
  if (items.length === 0) return <HistoryEmpty status={status} />
  return <CheckInsList items={items} />
}

function CheckInsPageContent() {
  const { status, page, setStatus, setPage } = useCheckInFilters()
  const query = useMyCheckIns({ page, status })
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

      <CheckInFilterBar status={status} onStatusChange={setStatus} />

      <CheckInsBody query={query} status={status} />

      <CheckInsPager page={page} pages={pages} onChange={setPage} />
    </section>
  )
}

export default function CheckInsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CheckInsPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/frontend && pnpm test -- "check-ins/page"
```

Esperado: todos os 5 testes passando

- [ ] **Step 5: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros de tipo

- [ ] **Step 6: Rodar lint**

```bash
pnpm --filter frontend lint:fix
```

Esperado: sem erros de lint

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/check-ins/
git commit -m "feat(frontend): integrate filter and URL pagination into user check-ins page"
```

## Critérios de Sucesso

- Filter bar com 4 pills renderiza acima da lista [RF-001]
- `useMyCheckIns` recebe `status` e `page` da URL [RF-004, RF-005]
- Empty state exibe mensagem contextual ao filtro ativo [RF-014]
- Trocar filtro reseta página para 1 via URL (comportamento do hook — RF-007)
- Página e status persistidos na URL (comportamento do hook — RF-006, RF-010, RF-011)
- `tsc:check` e `lint:fix` sem erros [RF-008, RF-009]
