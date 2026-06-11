---
created_at: "2026-05-30T19:35:06-03:00"
updated_at: "2026-05-30T19:35:06-03:00"
---

# Design Spec — Badges, Busca por Academia e Ordenação em Check-ins

## Visão Geral

Adicionar três melhorias de UX à tela de check-ins — tanto a tela do usuário (`/check-ins`) quanto o painel admin (`/admin/check-ins`):

1. **Badges de contagem** nos pills de filtro — exibir o total de cada status (Todos, Pendentes, Aprovados, Rejeitados) ao lado de cada pill.
2. **Busca por nome de academia** — campo de texto com debounce que filtra check-ins por nome de academia, enviando a query ao backend.
3. **Ordenação** — toggle que alterna entre "Mais recentes" e "Mais antigos", controlando o `sortOrder` na query.

**Contexto:** A feature `checkin-filter-pagination` já implementou pills de status + paginação. Esta spec estende essa base sem alterá-la.

**Layout aprovado (Opção A):**
```
Linha 1: [Todos (42)] [Pendentes (12)] [Aprovados (25)] [Rejeitados (5)]
Linha 2: [🔍 Buscar por academia.....................] [↕ Mais recentes]
         ─────────────── lista de check-ins ─────────────────────────
         < 1  2  3 ... >
```

---

## Escopo

### Incluído

- Endpoints de stats no backend para admin e user
- Extensão dos endpoints de lista existentes com `gymName` e `sortOrder`
- Frontend: hook estendido, novos componentes, integração nas duas páginas
- Regeneração dos tipos compartilhados (`@repo/api-types`)

### Excluído

- Filtro por data de check-in
- Busca por nome de usuário (somente academia)
- Ordenação por campos além de `createdAt`
- Página `/notificacoes` ou qualquer outra rota

---

## Backend

### 1. Novos endpoints de stats

| Método | Rota | Auth | Resposta |
|---|---|---|---|
| `GET` | `/check-ins/stats` | isProtected + onlyAdmin | `CheckInStats` |
| `GET` | `/check-ins/me/stats` | isProtected | `CheckInStats` (escopado ao userId do JWT) |

**Tipo de resposta:**
```typescript
interface CheckInStats {
  total: number
  pending: number
  validated: number
  rejected: number
}
```

#### Novos artefatos de backend (stats)

**Use Case:** `GetCheckInStatsUseCase`
- Localização: `src/check-in/application/use-case/get-check-in-stats.usecase.ts`
- Input: `{ userId?: string }` — quando presente, escopa ao usuário; ausente = stats globais (admin)
- Output: `Either<never, CheckInStats>`

**Controllers:**
- `GetCheckInStatsController` — admin, `GET /check-ins/stats`, `isProtected: true`, `onlyAdmin: true`
- `GetMyCheckInStatsController` — user, `GET /check-ins/me/stats`, `isProtected: true`

**Repository — novo método:**
```typescript
countByStatus(userId?: string): Promise<CheckInStats>
```
Implementado via Prisma `groupBy` ou 4 `count()` paralelos (`Promise.all`).

**IoC:** símbolos em `src/shared/infra/ioc/module/service-identifier/check-in-types.ts`; bindings no container de check-in existente.

---

### 2. Extensão dos endpoints de lista existentes

Adicionar a `FindManyInput` e aos query schemas de `GET /check-ins` e `GET /check-ins/me`:

| Parâmetro | Tipo | Default | Descrição |
|---|---|---|---|
| `gymName` | `string` (opcional) | `undefined` | Filtro parcial, case-insensitive, sobre `gym.name` |
| `sortOrder` | `'asc' \| 'desc'` (opcional) | `'desc'` | Ordem por `createdAt` |

**Prisma — join com Gym:**
```typescript
where: {
  ...(userId ? { userId } : {}),
  ...(gymName ? { gym: { name: { contains: gymName, mode: 'insensitive' } } } : {}),
  ...(status ? { status } : {}),
}
orderBy: { createdAt: sortOrder ?? 'desc' }
```

O join com a tabela `Gym` já existe via relação no schema Prisma. Não requer migration.

**Arquivos modificados:**
| Arquivo | Mudança |
|---|---|
| `src/check-in/application/repository/check-in-repository.ts` | Adicionar `gymName?` e `sortOrder?` a `FindManyInput` |
| `src/check-in/application/use-case/fetch-check-ins.usecase.ts` | Receber e repassar `gymName` e `sortOrder` |
| `src/check-in/infra/repository/prisma-check-in.repository.ts` | Implementar filtro e ordenação |
| `src/check-in/infra/repository/in-memory-check-in.repository.ts` | Implementar filtro JS e ordenação |
| `src/check-in/infra/controller/list-check-ins.controller.ts` | Adicionar `gymName` e `sortOrder` ao query schema |
| `src/check-in/infra/controller/list-user-check-ins.controller.ts` | Idem |

---

## Frontend

### 1. Hook `useCheckInFilters` (extensão)

Localização: `apps/frontend/src/features/check-ins/hooks/use-check-in-filters.ts`

Adicionar ao estado gerenciado via URL search params:

```typescript
interface UseCheckInFiltersReturn {
  status: CheckInFilterStatus
  page: number
  gymName: string       // novo
  sortOrder: SortOrder  // novo — 'asc' | 'desc'
  setStatus: (status: CheckInFilterStatus) => void   // reseta page=1
  setPage: (page: number) => void
  setGymName: (name: string) => void                 // novo — reseta page=1
  setSortOrder: (order: SortOrder) => void           // novo — reseta page=1
}

type SortOrder = 'asc' | 'desc'
```

**Comportamento:**
- `setGymName` — faz debounce de 300ms antes de escrever na URL; ao mudar, reseta `page=1`
- `setSortOrder` — alterna imediatamente; ao mudar, reseta `page=1`
- Valores inválidos na URL (`sortOrder=foo`) → defaultam para `'desc'`
- URL resultante: `?status=pending&page=1&gymName=fit&sortOrder=asc`

---

### 2. Novos hooks de stats

**`useMyCheckInStats`**
- Localização: `apps/frontend/src/features/check-ins/hooks/use-my-check-in-stats.ts`
- Chama `GET /check-ins/me/stats`
- `staleTime: 30_000` — stats ficam frescos por 30s
- Retorna `{ stats: CheckInStats | undefined, isLoading: boolean }`

**`useAdminCheckInStats`**
- Localização: `apps/frontend/src/features/check-ins/hooks/use-admin-check-in-stats.ts`
- Chama `GET /check-ins/stats`
- Mesmas configurações de cache

---

### 3. Novos componentes

#### `CheckInSearchInput`
- Localização: `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`
- Input controlado — dispara `onChange` em cada keystroke (sem debounce interno)
- O debounce de 300ms fica em `useCheckInFilters.setGymName`, centralizando a lógica de URL
- Props: `value: string`, `onChange: (value: string) => void`
- Placeholder: `"Buscar por academia..."`
- Limpar via ícone X quando há valor

#### `CheckInSortToggle`
- Localização: `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx`
- Botão toggle: alterna entre `'desc'` ("Mais recentes") e `'asc'` ("Mais antigos")
- Props: `value: SortOrder`, `onChange: (order: SortOrder) => void`
- Exibe ícone `↕` + label

---

### 4. Componente existente: `CheckInFilterBar`

Adicionar prop opcional `stats?: CheckInStats` sem quebrar chamadas existentes:

```typescript
interface CheckInFilterBarProps {
  status: CheckInFilterStatus
  onStatusChange: (status: CheckInFilterStatus) => void
  stats?: CheckInStats   // novo — opcional
}
```

Quando `stats` está presente, renderiza badge numérico ao lado de cada label:
```
[Todos (42)] [Pendentes (12)] [Aprovados (25)] [Rejeitados (5)]
```
Quando `stats` está ausente ou em loading, exibe pills sem badge (sem skeleton — evita layout shift).

---

### 5. Atualização das páginas

**Ambas as páginas** (`/check-ins/page.tsx` e `/admin/check-ins/page.tsx`):

1. Adicionar hook de stats correspondente (`useMyCheckInStats` / `useAdminCheckInStats`)
2. Passar `stats` para `CheckInFilterBar`
3. Adicionar `CheckInSearchInput` + `CheckInSortToggle` na linha 2 do layout
4. Passar `gymName` e `sortOrder` para `useMyCheckIns` / `useCheckIns`

**Atualização dos hooks de lista** (`useMyCheckIns`, `useCheckIns`):
- Aceitar `gymName?: string` e `sortOrder?: SortOrder` no input
- Incluir ambos na query key do TanStack Query para invalidação correta

---

### 6. API types

Após as mudanças no backend:
```bash
pnpm generate:types
```
Atualiza `@repo/api-types` com os novos endpoints e parâmetros.

---

## Fluxo de dados

```
URL: /check-ins?status=pending&page=1&gymName=fit&sortOrder=desc
         │
  useCheckInFilters()
  ├─ status: 'pending', page: 1, gymName: 'fit', sortOrder: 'desc'
  └─ setGymName (debounce 300ms) / setSortOrder (imediato)
         │
  useMyCheckIns({ status, page, gymName, sortOrder })
  useMyCheckInStats()
         │
  GET /check-ins/me?status=pending&page=1&gymName=fit&sortOrder=desc
  GET /check-ins/me/stats
         │
  ┌──────────────────────────────────────────────────────────┐
  │  CheckInFilterBar (pills + badges via stats)             │
  │  CheckInSearchInput [fit] · CheckInSortToggle [↕ desc]   │
  │  CheckInItem × N                                         │
  │  CheckInsPager                                           │
  └──────────────────────────────────────────────────────────┘
```

---

## Edge Cases

| Cenário | Comportamento |
|---|---|
| `gymName` com 0 resultados | Empty state existente: "Nenhum check-in encontrado" |
| Stats em loading | Pills sem badge (sem layout shift) |
| `sortOrder` inválido na URL | Default para `'desc'` |
| `gymName` inválido na URL (XSS) | Sanitizado pelo backend Fastify; frontend envia como string |
| Troca de filtro durante loading | `keepPreviousData` no TanStack Query (comportamento existente) |
| Usuário sem check-ins | Stats retorna `{ total: 0, pending: 0, validated: 0, rejected: 0 }` |

---

## Testes

### Unit tests (`*.test.ts` / `*.test.tsx`)

| Arquivo | Cobertura |
|---|---|
| `use-check-in-filters.test.ts` | `setGymName` reseta page=1; `setSortOrder` reseta page=1; defaults para sortOrder inválido; gymName refletido na URL |
| `check-in-filter-bar.test.tsx` | Pill "Todos" com badge 42; badge omitido quando stats=undefined |
| `check-in-search-input.test.tsx` | Debounce 300ms; botão X limpa o campo |
| `check-in-sort-toggle.test.tsx` | Toggle alterna 'desc'↔'asc'; label correto por valor |
| `get-check-in-stats.usecase.test.ts` | Retorna contagens corretas; escopa por userId quando fornecido |

### Business flow tests (`*.business-flow-test.ts`)

| Arquivo | Cenários |
|---|---|
| `get-check-in-stats.business-flow-test.ts` | 401 sem token; 403 user em rota admin; 200 com stats corretos |
| `get-my-check-in-stats.business-flow-test.ts` | 401 sem token; 200 escopado ao usuário |
| `list-check-ins.business-flow-test.ts` (extensão) | Filtro `gymName` retorna apenas check-ins da academia; `sortOrder=asc` retorna ordem crescente |
