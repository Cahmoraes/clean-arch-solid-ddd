# Task 7: Frontend — Integrar tudo nas páginas de check-in [RF-001..RF-019]

**Status:** DONE
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** task-03, task-04, task-05, task-06

## Visão Geral

Integra todos os novos hooks e componentes nas duas páginas de check-in:
- **`/check-ins`** (usuário): usa `useMyCheckInStats`, passa `stats` para `CheckInFilterBar`, adiciona `CheckInSearchInput` + `CheckInSortToggle`, passa `gymName` e `sortOrder` para `useMyCheckIns`
- **`/admin/check-ins`** (admin): mesmo padrão com `useAdminCheckInStats` e `useCheckIns`

O padrão de debounce segue a convenção da página de usuários:
- Estado local `[gymNameInput, setGymNameInput]` para o valor ao vivo do input
- `useDebounce(gymNameInput, 300)` → `debouncedGymName`
- `useEffect` que chama `setGymName(debouncedGymName)` quando `debouncedGymName` muda
- `gymNameInput` é passado como `value` ao `CheckInSearchInput` (exibe ao vivo)
- `gymName` do hook (URL) é passado para `useMyCheckIns`/`useCheckIns` (filtro com debounce)

Layout (Opção A aprovada):
- Linha 1: `CheckInFilterBar` com badges
- Linha 2: `[CheckInSearchInput flex-1] [CheckInSortToggle]`

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: hooks de stats com `staleTime: 30_000`; lista com `keepPreviousData`
- code-style: debounce via `useDebounce` no container (página), não nos componentes

## Passos

### Passo 1: Atualizar a página `/check-ins` (usuário)

**`apps/frontend/src/app/(authenticated)/check-ins/page.tsx`** — conteúdo completo atualizado:

```typescript
"use client"

import { CalendarCheck } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHECK_INS_DEFAULT_PAGE_SIZE,
  useMyCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { CheckInSearchInput } from "@/features/check-ins/components/check-in-search-input"
import { CheckInSortToggle } from "@/features/check-ins/components/check-in-sort-toggle"
import { CheckInsPager } from "@/features/check-ins/components/check-ins-pager"
import {
  type CheckInFilterStatus,
  useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters"
import { useMyCheckInStats } from "@/features/check-ins/hooks/use-my-check-in-stats"
import {
  CHECK_IN_STATUS_LABELS,
  totalCheckInPages,
} from "@/features/check-ins/utils"
import { useAuthStore } from "@/lib/auth/auth-store"
import { useDebounce } from "@/hooks/use-debounce"

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

interface ListProps {
  items: ReadonlyArray<{
    id: string
    gymId: string
    gymTitle?: string | null
    validatedAt: string | null
    rejectedAt: string | null
    status: "pending" | "validated" | "rejected"
    createdAt: string
  }>
}

function CheckInsList({ items }: ListProps) {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === "ADMIN"

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
      title={`Nenhum check-in ${CHECK_IN_STATUS_LABELS[status]} encontrado`}
      description="Tente selecionar outro filtro."
    />
  )
}

interface BodyProps {
  query: ReturnType<typeof useMyCheckIns>
  status: CheckInFilterStatus
}

function HistoryError({ query }: Pick<BodyProps, "query">) {
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
  const { status, page, gymName, sortOrder, setStatus, setPage, setGymName, setSortOrder } =
    useCheckInFilters()
  const { data: statsData } = useMyCheckInStats()

  // Debounce para gymName: estado local ao vivo → debounced → URL
  const [gymNameInput, setGymNameInput] = useState(gymName)
  const debouncedGymName = useDebounce(gymNameInput, 300)

  useEffect(() => {
    setGymName(debouncedGymName)
  }, [debouncedGymName, setGymName])

  const query = useMyCheckIns({ page, status, gymName, sortOrder })
  const pages = totalCheckInPages(
    query.data?.total ?? 0,
    CHECK_INS_DEFAULT_PAGE_SIZE,
  )

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

      <CheckInFilterBar
        status={status}
        onStatusChange={setStatus}
        stats={statsData}
      />

      <div className="flex gap-3">
        <CheckInSearchInput
          value={gymNameInput}
          onChange={setGymNameInput}
          placeholder="Buscar por academia..."
          className="flex-1"
        />
        <CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
      </div>

      <CheckInsBody query={query} status={status} />

      <CheckInsPager
        page={page}
        pages={pages}
        onChange={setPage}
        testId="checkins"
      />
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

### Passo 2: Atualizar a página `/admin/check-ins`

**`apps/frontend/src/app/(authenticated)/admin/check-ins/page.tsx`** — conteúdo completo atualizado:

```typescript
"use client"

import { ShieldCheck } from "lucide-react"
import { Suspense, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CHECK_INS_DEFAULT_PAGE_SIZE,
  type CheckIn,
  useCheckIns,
} from "@/features/check-ins/api"
import { CheckInActions } from "@/features/check-ins/components/check-in-actions"
import { CheckInFilterBar } from "@/features/check-ins/components/check-in-filter-bar"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { CheckInSearchInput } from "@/features/check-ins/components/check-in-search-input"
import { CheckInSortToggle } from "@/features/check-ins/components/check-in-sort-toggle"
import { CheckInsPager } from "@/features/check-ins/components/check-ins-pager"
import {
  type CheckInFilterStatus,
  useCheckInFilters,
} from "@/features/check-ins/hooks/use-check-in-filters"
import { useAdminCheckInStats } from "@/features/check-ins/hooks/use-admin-check-in-stats"
import {
  CHECK_IN_STATUS_LABELS,
  totalCheckInPages,
} from "@/features/check-ins/utils"
import { useDebounce } from "@/hooks/use-debounce"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"]

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
      title={`Nenhum check-in ${CHECK_IN_STATUS_LABELS[status]} encontrado`}
      description="Tente selecionar outro filtro."
    />
  )
}

function AdminCheckInList({ items }: { items: ReadonlyArray<CheckIn> }) {
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

function AdminCheckInsError({ query }: Pick<BodyProps, "query">) {
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
  return <AdminCheckInList items={items} />
}

function AdminCheckInsPageContent() {
  const { status, page, gymName, sortOrder, setStatus, setPage, setGymName, setSortOrder } =
    useCheckInFilters()
  const { data: statsData } = useAdminCheckInStats()

  // Debounce para gymName: estado local ao vivo → debounced → URL
  const [gymNameInput, setGymNameInput] = useState(gymName)
  const debouncedGymName = useDebounce(gymNameInput, 300)

  useEffect(() => {
    setGymName(debouncedGymName)
  }, [debouncedGymName, setGymName])

  const query = useCheckIns({ page, status, gymName, sortOrder })
  const pages = totalCheckInPages(
    query.data?.total ?? 0,
    CHECK_INS_DEFAULT_PAGE_SIZE,
  )

  return (
    <section
      aria-label="Check-ins"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
    >
      <PageHeader
        eyebrow="Admin"
        title="Check-ins"
        subtitle="Gerencie e valide os check-ins registrados pelos membros."
        className="mb-0"
      />

      <CheckInFilterBar
        status={status}
        onStatusChange={setStatus}
        stats={statsData}
      />

      <div className="flex gap-3">
        <CheckInSearchInput
          value={gymNameInput}
          onChange={setGymNameInput}
          placeholder="Buscar por academia..."
          className="flex-1"
        />
        <CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
      </div>

      <AdminCheckInsBody query={query} status={status} />

      <CheckInsPager
        page={page}
        pages={pages}
        onChange={setPage}
        testId="admin-checkins"
      />
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

### Passo 3: Verificar compilação

- [ ] **Step 3: Type check**

```bash
cd apps/frontend && pnpm tsc:check 2>&1 | tail -15
```

Resultado esperado: zero erros TypeScript. Se houver erro no `useEffect` de deps (lint rule), adicionar `// biome-ignore lint/correctness/useExhaustiveDependencies: setGymName is stable` acima do `useEffect`.

### Passo 4: Rodar lint

- [ ] **Step 4: Lint**

```bash
cd apps/frontend && pnpm lint:fix 2>&1 | tail -10
```

Resultado esperado: zero issues. Atenção ao `useEffect` dependency array — Biome pode reportar `setGymName` como dependência faltante. Se ocorrer, adicionar `setGymName` ao array de dependências: `[debouncedGymName, setGymName]`.

### Passo 5: Rodar todos os testes do frontend

- [ ] **Step 5: Testes**

```bash
cd apps/frontend && pnpm test 2>&1 | tail -20
```

Resultado esperado: todos passam.

### Passo 6: Build completo

- [ ] **Step 6: Build**

```bash
cd apps/frontend && pnpm build 2>&1 | tail -20
```

Resultado esperado: build bem-sucedido sem erros.

### Passo 7: Rodar suite de validação completa do backend também

- [ ] **Step 7: Validação backend**

```bash
cd apps/backend && pnpm tsc:check && pnpm biome:fix && pnpm test:run 2>&1 | tail -20
```

Resultado esperado: zero erros em todos.

### Passo 8: Commit

- [ ] **Step 8: Commit**

```bash
git add \
  apps/frontend/src/app/\(authenticated\)/check-ins/page.tsx \
  apps/frontend/src/app/\(authenticated\)/admin/check-ins/page.tsx
git commit -m "feat(check-ins): integrate badges, gym search and sort in check-in pages"
```

## Critérios de Sucesso

- `/check-ins` exibe badges nos pills com contagem de stats do usuário atual
- `/admin/check-ins` exibe badges nos pills com contagem de todos os check-ins
- Campo de busca com debounce 300ms dispara nova query ao parar de digitar
- Toggle ↕ alternando entre "Mais recentes" / "Mais antigos" atualiza a lista
- URL reflete `gymName` e `sortOrder` (compartilhável, RF-017)
- Busca vazia + sem filtro → empty state "Nenhum resultado" (RF-019)
- `pnpm build`, `pnpm test` e `pnpm tsc:check` passam no frontend
- RF-001..RF-019 todos cobertos
