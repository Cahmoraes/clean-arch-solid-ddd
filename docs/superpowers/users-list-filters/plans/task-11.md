# Task 11: Frontend — Integrar tudo na AdminUsersPage [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007, RF-012, RF-013, RF-016]

**Status:** DONE
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Integra `UserFilterBar` e `useUserStats` na `AdminUsersPage`. Adiciona o estado `activeFilter`, garante que trocar de filtro reseta a paginação (RF-012), e posiciona o `UserFilterBar` acima do campo de busca. Os contadores vêm de `useUserStats` (carregamento independente da lista). Ao final, roda `pnpm build` para confirmar que tudo compila.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- react: estado local com `useState`, efeito com `useEffect` (padrão já existente na página)
- tanstack-query-best-practices: `useUserStats` e `useUsers` em paralelo — não em sequência
- tailwindcss: não adicionar classes além do necessário; manter estrutura do `<header>`

## Passos

- [ ] **Step 1: Atualizar as importações**

No topo de `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`, adicione as importações:

```typescript
import { UserFilterBar } from "@/features/admin/components/user-filter-bar"
import { useUserStats } from "@/features/admin/api/use-user-stats"
import type { UserFilter, UserStats } from "@/features/admin/types"
```

- [ ] **Step 2: Adicionar o estado activeFilter e o hook useUserStats**

Dentro de `AdminUsersPage`, adicione o estado e o hook logo após a declaração de `limit`:

```typescript
const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
const { data: statsData } = useUserStats()

const emptyStats: UserStats = {
  total: 0,
  members: 0,
  admins: 0,
  active: 0,
  inactive: 0,
}
const stats: UserStats = statsData ?? emptyStats
```

- [ ] **Step 3: Criar o handler handleFilterChange**

Após `handleModalClose`, adicione:

```typescript
function handleFilterChange(filter: UserFilter) {
  setActiveFilter(filter)
  setPage(1)
}
```

- [ ] **Step 4: Passar o filtro ao useUsers**

Atualize a chamada ao hook `useUsers` para incluir o filtro:

```typescript
const { data, isLoading, isError, error, isFetching } = useUsers({
  page,
  limit,
  query: debouncedQuery || undefined,
  filter: activeFilter,
})
```

- [ ] **Step 5: Adicionar UserFilterBar no JSX**

Dentro do `<header>`, adicione o `UserFilterBar` logo após o `<p>` de descrição e antes do `<Input>` de busca:

```tsx
<header className="flex flex-col gap-2">
  <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
    Usuários
  </h1>
  <p className="text-sm text-muted-foreground">
    Visualize todas as contas cadastradas na plataforma.
  </p>
  <UserFilterBar
    activeFilter={activeFilter}
    counts={stats}
    onFilterChange={handleFilterChange}
  />
  <Input
    data-testid="admin-users-search"
    type="search"
    placeholder="Buscar por nome ou e-mail..."
    value={inputQuery}
    onChange={(e) => setInputQuery(e.target.value)}
    className="max-w-sm"
  />
</header>
```

- [ ] **Step 6: Verificar o arquivo completo resultante**

O arquivo `page.tsx` final deve ter esta estrutura geral:

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
import { useUserStats } from "@/features/admin/api/use-user-stats"
import { UserDetailModal } from "@/features/admin/components/user-detail-modal"
import { UserFilterBar } from "@/features/admin/components/user-filter-bar"
import { UserRow } from "@/features/admin/components/user-row"
import type { UserFilter, UserStats } from "@/features/admin/types"
import { useDebounce } from "@/hooks/use-debounce"
import type { ApiError } from "@/lib/errors"

// ... (LoadingState, ErrorState, UsersEmpty, UsersPagination, UsersList, UsersContent — inalterados)

export default function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [inputQuery, setInputQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<UserFilter>("all")
  const debouncedQuery = useDebounce(inputQuery, 500)
  const limit = ADMIN_USERS_DEFAULT_LIMIT

  const { data: statsData } = useUserStats()
  const emptyStats: UserStats = { total: 0, members: 0, admins: 0, active: 0, inactive: 0 }
  const stats: UserStats = statsData ?? emptyStats

  // biome-ignore lint/correctness/useExhaustiveDependencies: debouncedQuery é o gatilho intencional para resetar a página
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  const { data, isLoading, isError, error, isFetching } = useUsers({
    page,
    limit,
    query: debouncedQuery || undefined,
    filter: activeFilter,
  })

  const totalPages = useMemo(() => {
    if (!data) return 0
    return Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit))
  }, [data])

  const activeSelectedUser = useMemo(() => {
    if (!selectedUser) return null
    return data?.users.find((user) => user.id === selectedUser.id) ?? selectedUser
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

  function handleFilterChange(filter: UserFilter) {
    setActiveFilter(filter)
    setPage(1)
  }

  return (
    <section
      data-testid="admin-users-page"
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
      aria-busy={isFetching}
    >
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
          Usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualize todas as contas cadastradas na plataforma.
        </p>
        <UserFilterBar
          activeFilter={activeFilter}
          counts={stats}
          onFilterChange={handleFilterChange}
        />
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

- [ ] **Step 7: Rodar lint e verificar tipos**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Esperado: zero erros.

- [ ] **Step 8: Rodar todos os testes do frontend**

```bash
pnpm --filter frontend test
```

Esperado: todos os testes passando.

- [ ] **Step 9: Build do frontend**

```bash
pnpm --filter frontend build
```

Esperado: build concluído sem erros.

- [ ] **Step 10: Build completo do monorepo**

```bash
pnpm build
```

Esperado: build de todos os pacotes sem erros.

## Critérios de Sucesso

- `UserFilterBar` aparece acima do `<Input>` de busca
- `activeFilter` state inicializa como `"all"`
- `handleFilterChange` atualiza `activeFilter` e reseta `page` para 1
- `useUsers` recebe `filter: activeFilter`
- `useUserStats` roda em paralelo com `useUsers` (não em sequência)
- Contadores exibem 0 enquanto `statsData` não chegou (`emptyStats` fallback)
- `lint:fix`, `tsc:check`, `test` e `build` passam sem erros
