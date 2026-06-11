---
created_at: "2026-05-27T19:11:05-03:00"
updated_at: "2026-05-27T19:11:05-03:00"
---

# Users List Filters — Design Spec

## Visão Geral

Adequação da página `/admin/usuarios` para:

1. **Ajustar largura** ao mesmo container do check-ins (`max-w-3xl`)
2. **Adicionar filtros por categoria** de usuário: Todos, Membros, Administradores, Ativos, Inativos
3. **Exibir contadores** por categoria no topo da página via tabs com badge numérico
4. **Suporte backend** para filtro por `role` e `status` na listagem e endpoint de stats

---

## Seção 1 — Layout e Largura

### Mudança

O `<section>` da página `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx` substitui suas classes de container para alinhar com o padrão do check-ins:

**Antes:**
```tsx
<section className="flex flex-col gap-8">
```

**Depois:**
```tsx
<section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
```

Nenhuma outra alteração estrutural na página.

---

## Seção 2 — Componente `UserFilterBar`

### Localização

`apps/frontend/src/features/admin/components/user-filter-bar.tsx`

### Tipos

```ts
export type UserFilter = 'all' | 'member' | 'admin' | 'active' | 'inactive'

export interface UserStats {
  total: number
  members: number
  admins: number
  active: number
  inactive: number
}
```

Esses tipos são exportados de `apps/frontend/src/features/admin/types.ts` (arquivo existente ou novo).

### Props

```ts
interface UserFilterBarProps {
  activeFilter: UserFilter
  counts: UserStats
  onFilterChange: (filter: UserFilter) => void
}
```

### Tabs

| Label | `filter` value | Contagem exibida |
|-------|---------------|-----------------|
| Todos | `all` | `counts.total` |
| Membros | `member` | `counts.members` |
| Administradores | `admin` | `counts.admins` |
| Ativos | `active` | `counts.active` |
| Inativos | `inactive` | `counts.inactive` |

### Layout visual

- Container de tabs: `bg-secondary rounded-md p-1 flex gap-1` (padrão shadcn/Tabs)
- Tab inativa: `text-muted-foreground px-3 py-1.5 rounded-sm text-sm`
- Tab ativa: `bg-background text-foreground shadow-sm rounded-sm px-3 py-1.5 text-sm font-medium`
- Badge de contagem: `<span>` com `rounded-full bg-muted text-muted-foreground text-xs px-1.5 py-0.5 ml-1`; na tab ativa usa `bg-secondary text-foreground`

O componente é puramente controlado — não mantém estado interno.

---

## Seção 3 — Backend

### 3.1 Novo endpoint `GET /users/stats`

**Rota:** `GET /users/stats`
**Auth:** `isProtected: true`, `onlyAdmin: true`

**Response:**
```ts
{
  total: number
  members: number
  admins: number
  active: number
  inactive: number
}
```

**Implementação:**

- Novo Use Case: `GetUserStatsUseCase`
- Novo método no repositório: `IUserRepository.countByFilter(filter: UserCountFilter): Promise<number>`
  ```ts
  type UserCountFilter =
    | { type: 'all' }
    | { type: 'role'; role: 'MEMBER' | 'ADMIN' }
    | { type: 'status'; isActive: boolean }
  ```
- O Use Case executa 5 queries de `COUNT` (idealmente em paralelo via `Promise.all`) e retorna o shape de stats
- Cache Redis: key `users:stats`, TTL 60s. Invalidado nas mesmas operações que invalidam `users:list`

**Símbolo IoC:** `UserTypes.GetUserStatsUseCase`

**Arquivo de rota:** `src/user/infra/controller/routes/user-routes.ts` — adicionar `GET_USER_STATS = '/users/stats'`

### 3.2 Filtros na listagem `GET /users`

**Parâmetros adicionais (opcionais):**

| Param | Tipo | Valores válidos |
|-------|------|----------------|
| `role` | string | `MEMBER`, `ADMIN` |
| `status` | string | `active`, `inactive` |

Os dois parâmetros são mutuamente exclusivos por semântica — o frontend nunca os envia juntos. O backend os processa independentemente (nenhuma validação de exclusividade necessária).

**Query Prisma:**
```ts
where: {
  ...(query && {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  }),
  ...(role && { role }),
  ...(isActive !== undefined && { isActive }),
}
```

**Cache Redis:** a key existente inclui `query` — adicionar `role` e `status` à composição da key para evitar cache stale entre filtros diferentes.

**DTO de input do Use Case:** estender `FetchUsersDTO` (ou equivalente) com `role?: 'MEMBER' | 'ADMIN'` e `status?: 'active' | 'inactive'`.

---

## Seção 4 — Data Flow no Frontend

### Hook `useUserStats`

**Arquivo:** `apps/frontend/src/features/admin/api/use-user-stats.ts`

```ts
export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => apiClient.GET('/users/stats'),
    staleTime: 30_000,
  })
}
```

### Hook `useUsers` — extensão

Adicionar parâmetro `filter?: UserFilter` ao objeto de opções existente. Mapeamento para query params:

```ts
const roleParam = filter === 'member' ? 'MEMBER' : filter === 'admin' ? 'ADMIN' : undefined
const statusParam = filter === 'active' ? 'active' : filter === 'inactive' ? 'inactive' : undefined
```

### Estado na página

```ts
const [activeFilter, setActiveFilter] = useState<UserFilter>('all')

function handleFilterChange(filter: UserFilter) {
  setActiveFilter(filter)
  setPage(1) // reset paginação
}
```

`useUserStats()` e `useUsers(...)` rodam em paralelo. Os contadores do `UserFilterBar` vêm de `useUserStats`. A lista e paginação vêm de `useUsers` com o filtro ativo.

### Invalidação de cache TanStack Query

Nas mutações de promoção/demissão já existentes (admin-role-management), adicionar invalidação de `['users', 'stats']` junto com a invalidação de `['users']`.

---

## Seção 5 — Ordem visual na página

```
<section max-w-3xl>
  <h1>Usuários</h1>                         ← título existente
  <UserFilterBar />                          ← novo, tabs + badges
  <UserSearchInput />                        ← existente, abaixo das tabs
  <UserList />                              ← existente
  <UsersPagination />                       ← existente
</section>
```

---

## Convenções

- Tokens semânticos obrigatórios — nunca palette tokens diretamente
- `rounded-full` apenas em badges/avatars (não nos botões de tab)
- Sem comentários no código além do estritamente necessário para WHY não-óbvio
- Imports com alias `@/` e extensão `.js` nos imports internos do backend
- Use Case retorna `Either<Error, UserStatsDTO>` — erros técnicos (DB) são exceções, não Either

---

## Critérios de Conclusão

- `pnpm --filter frontend tsc:check` passa sem erros
- `pnpm --filter frontend lint:fix` passa sem issues
- `pnpm --filter frontend build` passa
- `pnpm --filter backend tsc:check` passa sem erros
- `pnpm --filter backend biome:fix` passa sem issues
- `pnpm --filter backend test:run` passa
- `pnpm --filter backend build` passa
- Filtros funcionam em dark mode e light mode
- Contadores refletem os dados reais do banco
- Trocar filtro reseta para página 1
- Busca por texto e filtro de categoria funcionam combinados
