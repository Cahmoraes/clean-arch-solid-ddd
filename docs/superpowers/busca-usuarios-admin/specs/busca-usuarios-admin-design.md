---
created_at: "2026-05-12T08:55:56-03:00"
updated_at: "2026-05-12T08:55:56-03:00"
---

# Design: Busca de Usuários por Nome ou Email (Admin)

## Problema

A rota `/admin/usuarios` exibe uma lista paginada de usuários, mas não oferece nenhuma forma de filtrar ou buscar por nome ou email. Administradores precisam percorrer várias páginas para localizar um usuário específico.

## Objetivo

Adicionar um campo de busca único na página `/admin/usuarios` que filtra usuários por nome **ou** email usando correspondência parcial (LIKE `%query%`), com busca server-side e paginação preservada nos resultados filtrados.

---

## Arquitetura

### Visão geral do fluxo

```
Usuário digita → inputQuery (estado local)
  → useDebounce(500ms) → debouncedQuery
  → setPage(1) (reset paginação)
  → useUsers({ page, limit, query: debouncedQuery })
  → GET /users?page=1&limit=10&query=joao
  → FetchUsersController → FetchUsersUseCase
  → UserDAO.fetchAndCountUsers({ page, limit, query })
  → Prisma OR [name ILIKE %query%, email ILIKE %query%]
  → Resultado filtrado + paginado
```

---

## Backend

### 1. DAO Interface — `UserDAO`

Adicionar campo opcional `query?: string` ao input de `fetchAndCountUsers()`:

```typescript
fetchAndCountUsers(input: { page: number; limit: number; query?: string }): Promise<FetchUsersData[]>
```

### 2. `PrismaUserDAO`

Quando `query` estiver preenchido, adicionar cláusula `where` com `OR` no Prisma:

```typescript
where: query
  ? {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    }
  : undefined,
```

Isso equivale a `ILIKE %query%` em name e email, sem distinção de maiúsculas/minúsculas.

### 3. `UserDAOMemory` (in-memory para testes)

Filtrar o array em memória antes de paginar:

```typescript
const filtered = query
  ? users.filter(u =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    )
  : users;
```

### 4. `FetchUsersUseCase`

- `FetchUsersInput` ganha `query?: string`
- Redis cache key atualizada: `fetch-users:page-${page}:limit-${limit}:query-${query ?? ''}`
- `query` repassado ao DAO sem transformação

### 5. `FetchUsersController`

Extrair `query` do querystring e passar ao use case:

```typescript
const { page, limit, query } = request.query
```

**Endpoint final:** `GET /users?page=1&limit=10&query=joao`

---

## Frontend

### 1. Hook `useDebounce`

Hook utilitário a criar em `src/hooks/use-debounce.ts`:

```typescript
function useDebounce<T>(value: T, delay: number): T
```

### 2. Hook `useUsers()`

Arquivo: `src/features/admin/api/use-users.ts`

- Adicionar `query?: string` ao input
- Query key: `["admin-users", page, limit, query]`
- Incluir `query` como query param na chamada HTTP quando preenchido

### 3. Página `admin/usuarios/page.tsx`

- Adicionar estado `inputQuery: string` (valor bruto do campo)
- Derivar `debouncedQuery` via `useDebounce(inputQuery, 500)`
- `useEffect` que chama `setPage(1)` quando `debouncedQuery` muda
- Passar `debouncedQuery` para `useUsers()`

### 4. Componente de busca

Componente inline ou extraído (`UserSearchInput`) com:
- `<Input>` shadcn, placeholder: *"Buscar por nome ou e-mail..."*
- Posicionado acima da lista de usuários, na área do header da página
- Valor controlado via `inputQuery`

---

## Comportamentos esperados

| Cenário | Comportamento |
|---|---|
| Campo vazio | Lista todos os usuários (comportamento atual) |
| Digitando | Aguarda 500ms de inatividade antes de buscar |
| Nova busca | Reseta paginação para página 1 |
| Busca sem resultado | Exibe `EmptyState` existente |
| Busca com resultado | Lista filtrada com paginação nos resultados |
| Query case-insensitive | "JOAO", "joao" e "Joao" retornam o mesmo resultado |

---

## Testes

### Backend (unit)
- `FetchUsersUseCase`: busca com `query` passa o valor ao DAO; sem `query` usa comportamento original
- `UserDAOMemory`: filtra corretamente por nome parcial, email parcial, e ambos juntos; case-insensitive

### Frontend (unit)
- `useDebounce`: retorna valor debounced após delay
- `useUsers`: inclui `query` na query key e na chamada HTTP quando fornecido

### Business Flow
- `GET /users?query=joao` retorna apenas usuários cujo nome ou email contém "joao"
- `GET /users?query=` retorna todos os usuários (equivalente a sem query)

---

## Arquivos afetados

### Backend
- `src/user/application/use-case/fetch-users.usecase.ts`
- `src/user/infra/controller/fetch-users.controller.ts`
- `src/shared/infra/database/dao/prisma/prisma-user-dao.ts`
- `src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- `src/user/application/persistence/dao/user-dao.ts` (interface)

### Frontend
- `src/hooks/use-debounce.ts` *(novo)*
- `src/features/admin/api/use-users.ts`
- `src/app/(authenticated)/admin/usuarios/page.tsx`
