# Task 5: Frontend — Hooks de academias consomem resposta paginada

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/normalizar-menu-e-paginacao-design.md
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

Atualizar os hooks de dados de academias (`useAllGyms`, `useGymsByName`) e suas funções de fetch subjacentes para consumir o novo shape `{ gyms, pagination: { total, page, limit } }` retornado pelo backend (via os tipos regenerados na task-04), expondo aos componentes um formato normalizado `PaginatedGyms { items, page, total }` — a interface `PaginatedGyms` já existe em `extended-paths.ts` mas hoje não é usada; esta task passa a usá-la de fato. Também atualiza os handlers MSW padrão para responder no novo shape, espelhando o padrão já usado pelo handler de `/users`.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Modify: `apps/frontend/src/features/gyms/api/index.ts`
- Modify: `apps/frontend/src/features/gyms/api/index.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: os hooks `useAllGyms`/`useGymsByName` continuam usando `useQuery` com `queryKey` já existentes — apenas o tipo de dado (`PaginatedGyms` em vez de `Gym[]`) muda; garantir que `select`/`queryFn` não introduzam refetches desnecessários e que o cache continue chaveado corretamente por página/termo de busca.
- `typescript-advanced`: o tipo de retorno de `UseQueryResult<PaginatedGyms, ApiError>` deve ser preciso; evitar `any`/type assertions ao extrair `gyms`/`pagination` da resposta do client gerado.
- `test-antipatterns`: os testes atualizados devem continuar validando o comportamento observável dos hooks (dados retornados pelo hook), não a implementação interna do client HTTP.
- `vitest`: manter a estrutura de teste (render de hook via `renderHook`/testing utilities já usadas) do arquivo `index.test.tsx`.

## Passos

- **Step 1: Atualizar os testes de `index.test.tsx` para o novo shape (e confirmar que falham)**

Abra `apps/frontend/src/features/gyms/api/index.test.tsx` e atualize todos os mocks MSW inline (`server.use(http.get(...))`) de `/gyms` e `/gyms/search/:name` para o novo envelope:

```typescript
// antes:
// server.use(
//   http.get('*/gyms', () => HttpResponse.json([{ id: '1', title: 'Academia A', ... }])),
// )

// depois:
server.use(
  http.get('*/gyms', () =>
    HttpResponse.json({
      gyms: [{ id: '1', title: 'Academia A', description: '...', phone: '...', imageKey: null, latitude: 0, longitude: 0 }],
      pagination: { total: 1, page: 1, limit: 20 },
    }),
  ),
)
```

E atualize as asserções correspondentes:

```typescript
// antes:
// expect(result.current.data).toHaveLength(1)
// expect(result.current.data?.[0]?.title).toBe('Academia A')

// depois:
expect(result.current.data?.items).toHaveLength(1)
expect(result.current.data?.items[0]?.title).toBe('Academia A')
expect(result.current.data?.total).toBe(1)
expect(result.current.data?.page).toBe(1)
```

Aplique essa troca de forma análoga em TODAS as ocorrências do arquivo que hoje tratam `result.current.data` como array (tanto para `useAllGyms` quanto para `useGymsByName`, incluindo o cenário de busca 404 que deve passar a esperar `{ items: [], page, total: 0 }`).

Run: `pnpm --filter frontend test -- --run features/gyms/api/index.test.tsx`
Expected: FAIL — os mocks MSW retornam o array bruto antigo, mas as novas asserções esperam `result.current.data.items`, então falha com `undefined` ou erro do tipo `Cannot read properties of undefined (reading 'items')`. Note que mesmo os mocks já ajustados para o novo shape ainda falham nesse ponto porque `index.ts` ainda não faz o unwrap de `{ gyms, pagination }` para `{ items, page, total }` — isso é implementado no Step 3.

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- --run features/gyms/api/index.test.tsx`
Expected: FAIL — asserções de `result.current.data?.items` recebem `undefined` porque `fetchAllGyms`/`searchGymsByName` ainda retornam o array bruto (ou, após o mock MSW já atualizado no Step 1, o objeto `{ gyms, pagination }` sem normalização para `{ items, page, total }`).

- **Step 3: Implementar o novo shape em `extended-paths.ts`**

Em `apps/frontend/src/features/gyms/api/extended-paths.ts`, reutilize a interface `PaginatedGyms` já existente (hoje não usada) e atualize o path `/gyms`:

```typescript
export interface PaginatedGyms {
  items: GymSummary[]
  page: number
  total: number
}

export interface GymExtendedPaths {
  '/gyms': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': {
              gyms: GymSummary[]
              pagination: {
                total: number
                page: number
                limit: number
              }
            }
          }
        }
      }
    }
  }
}
```

Preserve quaisquer outros paths/métodos já definidos em `GymExtendedPaths` que não sejam `/gyms` — altere apenas o `content` de `responses[200]` do método `get` de `/gyms`.

- **Step 4: Implementar o novo shape em `index.ts`**

Em `apps/frontend/src/features/gyms/api/index.ts`, atualize `fetchAllGyms` para extrair e normalizar a resposta:

```typescript
export async function fetchAllGyms(page: number): Promise<PaginatedGyms> {
  const response = await extendedApi.get('/gyms', { params: { query: { page } } })
  const { gyms, pagination } = response.data
  return { items: gyms, page: pagination.page, total: pagination.total }
}
```

E `searchGymsByName`, usando o client PADRÃO (`api`), já que `/gyms/search/{name}` está nos tipos gerados padrão e reflete `{ gyms, pagination }` após a task-04:

```typescript
export async function searchGymsByName(name: string, page: number): Promise<PaginatedGyms> {
  try {
    const response = await api.get('/gyms/search/{name}', { params: { path: { name }, query: { page } } })
    const { gyms, pagination } = response.data
    return { items: gyms, page: pagination.page, total: pagination.total }
  } catch (error) {
    if (isNotFoundError(error)) {
      return { items: [], page, total: 0 }
    }
    throw error
  }
}
```

Ajuste os nomes exatos dos clients (`api`/`extendedApi`), o helper de detecção de 404 (`isNotFoundError` ou equivalente já usado no arquivo) e a forma exata de passar `params` conforme o padrão já estabelecido no arquivo real — preserve o comportamento de erro/exceção para status diferentes de 404.

Atualize as assinaturas dos hooks:

```typescript
export function useAllGyms(page: number): UseQueryResult<PaginatedGyms, ApiError> {
  return useQuery({
    queryKey: ['gyms', 'all', page],
    queryFn: () => fetchAllGyms(page),
  })
}

export function useGymsByName(name: string, page: number): UseQueryResult<PaginatedGyms, ApiError> {
  return useQuery({
    queryKey: ['gyms', 'search', name, page],
    queryFn: () => searchGymsByName(name, page),
    enabled: Boolean(name),
  })
}
```

Preserve `queryKey`, `enabled` e quaisquer outras opções (`staleTime`, etc.) já configuradas no arquivo real — altere apenas o tipo de retorno de `UseQueryResult<Gym[], ApiError>` para `UseQueryResult<PaginatedGyms, ApiError>` e a lógica interna de `queryFn`.

- **Step 5: Atualizar o handler MSW padrão de `/gyms` e `/gyms/search/:name`**

Em `apps/frontend/src/test/msw/handlers.ts`, localize o handler já existente de `/users` (que responde `{ users: [], pagination: { page, limit, total: 0 } }` lendo `page`/`limit` da query string) e replique o mesmo padrão para `/gyms` e `/gyms/search/:name`:

```typescript
http.get('*/gyms', ({ request }) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  return HttpResponse.json({ gyms: [], pagination: { page, limit: 20, total: 0 } })
}),

http.get('*/gyms/search/:name', ({ request }) => {
  const url = new URL(request.url)
  const page = Number(url.searchParams.get('page') ?? '1')
  return HttpResponse.json({ gyms: [], pagination: { page, limit: 20, total: 0 } })
}),
```

Ajuste a forma exata de leitura de `page`/`limit` da query string para espelhar byte-a-byte o que o handler de `/users` já faz (mesmo helper de parsing, se houver um utilitário compartilhado).

- **Step 6: Rodar o teste e confirmar sucesso**

Run: `pnpm --filter frontend test -- --run features/gyms/api/index.test.tsx`
Expected: PASS — todas as asserções de `result.current.data?.items`/`.page`/`.total` passam.

- **Step 7: Rodar tsc:check do frontend e confirmar que o erro da task-04 foi resolvido**

Run: `pnpm --filter frontend tsc:check`
Expected: PASS — sem erros em `apps/frontend/src/features/gyms/api/index.ts` (o erro esperado e documentado na task-04 é resolvido por esta task).

- **Step 8: Commit**

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts \
  apps/frontend/src/features/gyms/api/index.ts \
  apps/frontend/src/features/gyms/api/index.test.tsx \
  apps/frontend/src/test/msw/handlers.ts
git commit -m "feat(gyms): hooks de academias consomem resposta paginada do backend"
```

## Critérios de Sucesso

- `fetchAllGyms`/`searchGymsByName` retornam `PaginatedGyms { items, page, total }`.
- `useAllGyms`/`useGymsByName` tipados como `UseQueryResult<PaginatedGyms, ApiError>`.
- Handlers MSW padrão de `/gyms` e `/gyms/search/:name` respondem `{ gyms: [], pagination: { page, limit: 20, total: 0 } }` lendo `page` da query string, no mesmo padrão do handler de `/users`.
- `pnpm --filter frontend test -- --run features/gyms/api/index.test.tsx` passa 100%.
- `pnpm --filter frontend tsc:check` passa sem erros (resolve a falha esperada documentada na task-04).
