---
created_at: "2026-06-01T15:45:17-03:00"
updated_at: "2026-06-01T15:45:17-03:00"
---

# Design Spec — Badges de Contagem no Filtro de Usuários Admin

## Visão Geral

Adicionar badges de contagem (FloatBadge) aos pills de filtro da página admin `/admin/usuarios`, exibindo o total de usuários em cada categoria: **Todos**, **Membros**, **Administradores**, **Ativos** e **Inativos**.

O comportamento segue exatamente o padrão do `CheckInFilterBar`: sem badge durante o carregamento (evita dados enganosos), badge verde flutuante no canto superior direito de cada pill após as stats carregarem.

**Layout aprovado:**
```
⏳ Carregando:
[Todos] [Membros] [Administradores] [Ativos] [Inativos]

✅ Após carregar:
[Todos ⁴²] [Membros ³⁵] [Administradores ⁷] [Ativos ³⁸] [Inativos ⁴]
           (círculo verde flutuando no canto superior direito de cada pill)
```

**Contexto:** A infraestrutura já está implementada — `GET /users/stats`, `useUserStats()` e `UserFilterBar` existem. Esta spec documenta os ajustes necessários para alinhar o comportamento de loading e o estilo de badge ao padrão `CheckInFilterBar`.

---

## Escopo

### Incluído

- Ajuste de `UserFilterBar` para `stats?` opcional com `FloatBadge`
- Atualização da página admin para passar `statsData` sem fallback `EMPTY_STATS`
- Invalidação do cache `['users', 'stats']` nas mutações de role (promoção/remoção de admin) e soft-delete
- Testes unitários atualizados para refletir o novo comportamento

### Excluído

- Qualquer mudança no backend (`GET /users/stats` já existe e retorna os dados corretos)
- Criação de novos endpoints
- Mudança no hook `useUserStats()` (já implementado corretamente)
- Badges na rota `/check-ins` (já implementado separadamente)

---

## Infraestrutura Existente (sem mudança)

| Artefato | Localização | Status |
|---|---|---|
| Endpoint `GET /users/stats` | `src/user/infra/controller/get-user-stats.controller.ts` | ✓ existe |
| `GetUserStatsUseCase` | `src/user/application/use-case/get-user-stats.usecase.ts` | ✓ existe |
| `useUserStats()` | `apps/frontend/src/features/admin/api/use-user-stats.ts` | ✓ existe |
| `UserStats` type | `apps/frontend/src/features/admin/types.ts` | ✓ existe |
| `SegmentedControl` (FloatBadge) | `apps/frontend/src/components/ui/segmented-control.tsx` | ✓ existe |

**Resposta do endpoint:**
```typescript
interface UserStats {
  total: number
  members: number
  admins: number
  active: number
  inactive: number
}
```

---

## Mudanças Necessárias

### 1. `UserFilterBar` — tornar `stats` opcional e habilitar FloatBadge

**Arquivo:** `apps/frontend/src/features/admin/components/user-filter-bar.tsx`

**Antes:**
```typescript
function buildItems(counts: UserStats): ReadonlyArray<SegmentedItem<UserFilter>> {
  return [
    { value: "all", label: "Todos", count: counts.total },
    { value: "member", label: "Membros", count: counts.members },
    { value: "admin", label: "Administradores", count: counts.admins },
    { value: "active", label: "Ativos", count: counts.active },
    { value: "inactive", label: "Inativos", count: counts.inactive },
  ]
}

interface UserFilterBarProps {
  activeFilter: UserFilter
  counts: UserStats          // ← required
  onFilterChange: (filter: UserFilter) => void
  className?: string
}
```

**Depois:**
```typescript
function buildItems(stats?: UserStats): ReadonlyArray<SegmentedItem<UserFilter>> {
  return [
    { value: "all", label: "Todos", count: stats?.total },
    { value: "member", label: "Membros", count: stats?.members },
    { value: "admin", label: "Administradores", count: stats?.admins },
    { value: "active", label: "Ativos", count: stats?.active },
    { value: "inactive", label: "Inativos", count: stats?.inactive },
  ]
}

interface UserFilterBarProps {
  activeFilter: UserFilter
  stats?: UserStats           // ← opcional
  onFilterChange: (filter: UserFilter) => void
  className?: string
}
```

E no JSX, adicionar `countFloat`:
```tsx
<SegmentedControl
  aria-label="Filtrar usuários por categoria"
  items={buildItems(stats)}
  value={activeFilter}
  onValueChange={onFilterChange}
  className={className}
  countFloat={stats !== undefined}   // ← novo
/>
```

**Mapeamento stats → badge:**
| Pill | Campo |
|---|---|
| Todos | `stats?.total` |
| Membros | `stats?.members` |
| Administradores | `stats?.admins` |
| Ativos | `stats?.active` |
| Inativos | `stats?.inactive` |

---

### 2. Página `/admin/usuarios` — remover fallback EMPTY_STATS

**Arquivo:** `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

**Antes:**
```typescript
const EMPTY_STATS: UserStats = { total: 0, members: 0, admins: 0, active: 0, inactive: 0 }

const { data: statsData } = useUserStats()
const stats: UserStats = statsData ?? EMPTY_STATS

// ...
<UserFilterBar
  activeFilter={activeFilter}
  counts={stats}
  onFilterChange={handleFilterChange}
  className="..."
/>
```

**Depois:**
```typescript
// remover EMPTY_STATS

const { data: stats } = useUserStats()

// ...
<UserFilterBar
  activeFilter={activeFilter}
  stats={stats}
  onFilterChange={handleFilterChange}
  className="..."
/>
```

---

### 3. Invalidação de cache após mutações

Quando o papel de um usuário é alterado (promoção/remoção de admin) ou um usuário é soft-deleted, as contagens ficam desatualizadas. As mutations relevantes devem invalidar a query key `[USER_STATS_QUERY_KEY]` no `onSuccess`.

**Mutations afetadas:**
| Hook | Evento | Ação |
|---|---|---|
| `usePromoteToAdmin` (ou equivalente) | `onSuccess` | `queryClient.invalidateQueries([USER_STATS_QUERY_KEY])` |
| `useRevokeAdmin` (ou equivalente) | `onSuccess` | `queryClient.invalidateQueries([USER_STATS_QUERY_KEY])` |
| `useDeleteUser` (soft-delete) | `onSuccess` | `queryClient.invalidateQueries([USER_STATS_QUERY_KEY])` |

> **Nota:** identificar os hooks de mutação exatos durante implementação. O padrão de invalidação é o mesmo em todos os casos.

---

## Comportamento dos Edge Cases

| Cenário | Comportamento |
|---|---|
| Stats em loading | Pills sem badge (sem layout shift, sem zeros) |
| Stats com erro | Pills sem badge (graceful degradation) |
| `total = 0` | Badge mostra `0` (usuário sem membros é estado válido) |
| Filtro trocado durante loading de stats | Filtro funciona normalmente; badge aparece ao carregar |

---

## Testes

### Unit tests a atualizar (`user-filter-bar.test.tsx`)

| Caso | Verificação |
|---|---|
| `stats` ausente (undefined) | Pills renderizam sem badge — nenhum elemento com contagem |
| `stats` presente | Cada pill exibe o badge com o valor correto do campo correspondente |
| Pill ativo com badge | Badge usa estilo `countFloat` (FloatBadge) |

### Teste da página a atualizar (`admin-usuarios.test.tsx`)

| Caso | Verificação |
|---|---|
| Durante loading de stats | `UserFilterBar` recebe `stats={undefined}` |
| Após stats carregadas | `UserFilterBar` recebe objeto `UserStats` com valores reais |

---

## Fluxo de Dados

```
GET /users/stats (staleTime 30s)
        │
  useUserStats() → { data: stats, isLoading }
        │
AdminUsersPage
  ├─ stats={stats}  →  UserFilterBar
  │                      ├─ stats undefined  → SegmentedControl (sem badge)
  │                      └─ stats defined    → SegmentedControl (countFloat=true → FloatBadge ×5)
  └─ invalidateQueries([USER_STATS_QUERY_KEY])
         ↑ disparado por: usePromoteToAdmin / useRevokeAdmin / useDeleteUser
```
