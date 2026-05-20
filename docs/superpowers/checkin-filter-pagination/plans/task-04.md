# Task 4: Tela de check-ins do admin — integrar filtro e paginação via URL [RF-004, RF-005, RF-008, RF-009, RF-014]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-filter-pagination.md`
**Spec:** `../specs/checkin-filter-pagination-design.md`

## Visão Geral

Atualizar `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx` para:
1. Usar `useCheckInFilters()` no lugar do `const [page] = useState(1)` estático.
2. Renderizar `CheckInFilterBar` acima da lista.
3. Passar `status` (do hook) para `useCheckIns` — removendo o `status: 'pending'` hardcoded.
4. Adicionar paginação (`CheckInsPager`) — que estava ausente na tela admin.
5. Remover o filtro client-side `.filter((item) => item.status !== 'rejected')` — a filtragem passa a ser server-side via param.
6. Tornar o empty state contextual ao filtro ativo.
7. Atualizar título/descrição da página para refletir que agora mostra todos os status.
8. Envolver o conteúdo da página em `<Suspense>` (obrigatório para `useSearchParams`).

**Contexto do código atual:**
- `const [page] = useState(1)` — sem setter, sem paginação funcional
- `useCheckIns({ page, status: 'pending' })` — status hardcoded
- `.filter((item) => item.status !== 'rejected')` — filtro client-side a remover
- Sem `CheckInsPager` — a tela admin não tinha paginação
- Título fixo: "Check-ins pendentes"

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`
- Create: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.test.tsx`

### Conformidade com as Skills Padrão

- test-driven-development: escrever testes antes de modificar a página
- react: Suspense boundary para `useSearchParams`
- no-workarounds: remover filtro client-side, usar server-side filtering

## Passos

- [ ] **Step 1: Criar o arquivo de teste**

```tsx
// apps/frontend/src/app/(authenticated)/admin/check-ins/page.test.tsx
import { render, screen } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECK_INS_DEFAULT_PAGE_SIZE, useCheckIns } from '@/features/check-ins/api'
import AdminCheckInsPage from './page.js'

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('@/features/check-ins/api', () => ({
  useCheckIns: vi.fn(),
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

describe('AdminCheckInsPage', () => {
  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({ replace: vi.fn() } as ReturnType<typeof useRouter>)
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as ReturnType<typeof useSearchParams>)
    vi.mocked(useCheckIns).mockReturnValue(mockQuerySuccess() as ReturnType<typeof useCheckIns>)
  })

  it('renders the filter bar with all 4 pills', () => {
    render(<AdminCheckInsPage />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitados' })).toBeInTheDocument()
  })

  it('calls useCheckIns with status from URL params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending&page=2') as ReturnType<typeof useSearchParams>)
    render(<AdminCheckInsPage />)
    expect(vi.mocked(useCheckIns)).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', page: 2 }),
    )
  })

  it('calls useCheckIns without status when no filter is active (Todos)', () => {
    render(<AdminCheckInsPage />)
    expect(vi.mocked(useCheckIns)).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    )
  })

  it('shows default empty state when no filter is active and list is empty', () => {
    render(<AdminCheckInsPage />)
    expect(screen.getByText('Nenhum check-in encontrado')).toBeInTheDocument()
  })

  it('shows contextual empty state when filter is active and list is empty', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=pending') as ReturnType<typeof useSearchParams>)
    render(<AdminCheckInsPage />)
    expect(screen.getByText('Nenhum check-in pendente encontrado')).toBeInTheDocument()
  })

  it('shows contextual empty state for rejected filter', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('status=rejected') as ReturnType<typeof useSearchParams>)
    render(<AdminCheckInsPage />)
    expect(screen.getByText('Nenhum check-in rejeitado encontrado')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/frontend && pnpm test -- "admin/check-ins/page"
```

Esperado: falha — testes de filter bar, status params e empty state contextual não passam ainda

- [ ] **Step 3: Atualizar a página admin**

Substituir o conteúdo de `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx` pelo seguinte:

```tsx
// apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx
'use client'

import { ShieldCheck } from 'lucide-react'
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
  type CheckIn,
  useCheckIns,
} from '@/features/check-ins/api'
import { CheckInFilterBar } from '@/features/check-ins/components/check-in-filter-bar.js'
import { CheckInActions } from '@/features/check-ins/components/check-in-actions'
import { CheckInItem } from '@/features/check-ins/components/check-in-item'
import {
  type CheckInFilterStatus,
  useCheckInFilters,
} from '@/features/check-ins/hooks/use-check-in-filters.js'

const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3']

function LoadingState() {
  return (
    <ul
      data-testid="admin-checkins-skeleton"
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

interface PagerProps {
  page: number
  pages: number
  onChange: (next: number) => void
}

function AdminCheckInsPager({ page, pages, onChange }: PagerProps) {
  if (pages <= 1) return null
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            data-testid="admin-checkins-prev"
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
            data-testid="admin-checkins-next"
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

function AdminCheckInsEmpty({ status }: { status: CheckInFilterStatus }) {
  if (!status) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nenhum check-in encontrado"
        description="Ainda não há check-ins registrados."
      />
    )
  }
  return (
    <EmptyState
      icon={ShieldCheck}
      title={`Nenhum check-in ${STATUS_LABELS[status]} encontrado`}
      description="Tente selecionar outro filtro."
    />
  )
}

function PendingList({ items }: { items: ReadonlyArray<CheckIn> }) {
  return (
    <ul data-testid="admin-checkins-list" className="flex flex-col gap-2">
      {items.map((checkIn) => (
        <CheckInItem
          key={checkIn.id}
          checkIn={checkIn}
          action={<CheckInActions checkIn={checkIn} />}
        />
      ))}
    </ul>
  )
}

interface BodyProps {
  query: ReturnType<typeof useCheckIns>
  status: CheckInFilterStatus
}

function AdminCheckInsError({ query }: Pick<BodyProps, 'query'>) {
  return (
    <EmptyState
      title="Não foi possível carregar os check-ins"
      description={query.error?.userMessage}
      action={
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          data-testid="admin-checkins-retry"
        >
          Tentar novamente
        </Button>
      }
    />
  )
}

function AdminCheckInsBody({ query, status }: BodyProps) {
  if (query.isLoading) return <LoadingState />
  if (query.isError) return <AdminCheckInsError query={query} />
  if (!query.isSuccess) return null
  const items = query.data?.items ?? []
  if (items.length === 0) return <AdminCheckInsEmpty status={status} />
  return <PendingList items={items} />
}

function AdminCheckInsPageContent() {
  const { status, page, setStatus, setPage } = useCheckInFilters()
  const query = useCheckIns({ page, status })
  const pages = totalPages(query.data?.total ?? 0, CHECK_INS_DEFAULT_PAGE_SIZE)

  return (
    <section
      aria-labelledby="admin-checkins-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
    >
      <header className="flex flex-col gap-1">
        <h1
          id="admin-checkins-title"
          className="font-display text-3xl font-medium text-foreground"
        >
          Check-ins
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie e valide os check-ins registrados pelos membros.
        </p>
      </header>

      <CheckInFilterBar status={status} onStatusChange={setStatus} />

      <AdminCheckInsBody query={query} status={status} />

      <AdminCheckInsPager page={page} pages={pages} onChange={setPage} />
    </section>
  )
}

export default function AdminCheckInsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AdminCheckInsPageContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
cd apps/frontend && pnpm test -- "admin/check-ins/page"
```

Esperado: todos os 6 testes passando

- [ ] **Step 5: Rodar a suite completa**

```bash
pnpm --filter frontend test
```

Esperado: todos os testes passando (incluindo tasks anteriores)

- [ ] **Step 6: Verificar tipos**

```bash
pnpm --filter frontend tsc:check
```

Esperado: sem erros de tipo

- [ ] **Step 7: Rodar lint**

```bash
pnpm --filter frontend lint:fix
```

Esperado: sem erros de lint

- [ ] **Step 8: Build de produção**

```bash
pnpm --filter frontend build
```

Esperado: build concluído sem erros

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/app/\(authenticated\)/admin/check-ins/
git commit -m "feat(frontend): integrate filter and URL pagination into admin check-ins page"
```

## Critérios de Sucesso

- Filter bar com 4 pills renderiza acima da lista admin [RF-001]
- `useCheckIns` recebe `status` e `page` da URL (sem hardcode de `'pending'`) [RF-004, RF-005]
- Filtro client-side `.filter((item) => item.status !== 'rejected')` removido [sem workaround]
- Paginação funcional no painel admin [RF-008, RF-009]
- Empty state contextual ao filtro ativo [RF-014]
- Título da página atualizado de "Check-ins pendentes" para "Check-ins"
- Suite completa de testes passando
- `tsc:check`, `lint:fix` e `build` sem erros
