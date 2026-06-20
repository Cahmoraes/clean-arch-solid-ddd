# Task 7: Mutation admin para editar nome/email de um usuário-alvo [FR-001, FR-003]

**Status:** PENDING
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-05

## Visão Geral

Cria a mutation TanStack Query que faltava: editar nome/email de um **outro** usuário (admin-facing), chamando `PATCH /users/:userId`. Hoje só existe `useUpdateProfile` que chama `PATCH /users/me` (próprio perfil). A nova `useUpdateUser` segue o padrão das mutations admin existentes (optimistic update + rollback + invalidação de `ADMIN_USERS_QUERY_KEY`/`USER_STATS_QUERY_KEY`). Status e role continuam usando as mutations existentes (`use-suspend-user`, `use-activate-user`, `use-promote-to-admin`, `use-demote-from-admin`) — a task 8 as orquestra.

## Arquivos

- Create: `apps/frontend/src/features/admin/api/use-update-user.ts`
- Test: `apps/frontend/src/features/admin/api/use-update-user.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: useMutation com `onMutate`/`onError`/`onSettled`, optimistic update e rollback, invalidação correta.
- `typescript-advanced`: payload tipado a partir de `@repo/api-types` (paths do endpoint).
- `no-workarounds`: reusar o client `api.PATCH` tipado; evitar cast desnecessário (o endpoint `/users/:userId` já tem tipo gerado).
- `test-antipatterns`: testar optimistic update via MSW, sem mockar fetch manualmente.

## Passos

- **Step 1: Escrever o teste falho (optimistic update)**

Em `use-update-user.test.tsx` (siga o padrão de `use-suspend-user.test.tsx`: MSW `server.use(http.patch(...))`, `renderHook`, `makeQueryClient`, `adminUsersQueryKey`):

```typescript
import { QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { apiBaseUrl } from "@/test/msw/handlers" // ajuste para a fonte real da base URL nos testes
import { adminUsersQueryKey } from "./use-users"
import { useUpdateUser } from "./use-update-user"
// reutilize os helpers wrapper/makeQueryClient do use-suspend-user.test.tsx

test("aplica optimistic update do nome antes da resposta", async () => {
  const queryClient = makeQueryClient()
  queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
    users: [{ id: "u1", name: "Antigo", email: "a@a.com", role: "MEMBER", status: "activated", isSuperAdmin: false, createdAt: "2025-01-01T00:00:00.000Z" }],
    pagination: { total: 1, page: 1, limit: 10 },
  })

  let resolveRequest!: () => void
  server.use(
    http.patch(`${apiBaseUrl}/users/u1`, async () => {
      await new Promise<void>((resolve) => { resolveRequest = resolve })
      return HttpResponse.json({ message: "ok", email: "novo@a.com" }, { status: 200 })
    }),
  )

  const { result } = renderHook(() => useUpdateUser(), { wrapper: wrapper(queryClient) })

  act(() => {
    result.current.mutate({ userId: "u1", name: "Novo", email: "novo@a.com" })
  })

  await waitFor(() => {
    const data = queryClient.getQueryData(adminUsersQueryKey(QUERY_PARAMS)) as any
    expect(data.users[0].name).toBe("Novo")
  })

  resolveRequest()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})
```

> Copie `QUERY_PARAMS`, `wrapper` e `makeQueryClient` exatamente como em `use-suspend-user.test.tsx` (mesma pasta) para manter consistência. Confirme o nome real do helper de base URL do MSW com `sg --pattern 'http.patch($URL' --lang tsx apps/frontend/src/features/admin/api`.

- **Step 2: Rodar e ver falhar**

Run: `pnpm --filter frontend test -- --run use-update-user`
Expected: FAIL — módulo `./use-update-user` inexistente.

- **Step 3: Implementar a mutation**

Create `apps/frontend/src/features/admin/api/use-update-user.ts` (espelhe a estrutura de `use-suspend-user.ts`):

```typescript
import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api" // ajuste para o caminho real do client tipado
import { type ApiError, toApiError } from "@/lib/errors"
import {
  ADMIN_USERS_QUERY_KEY,
  type AdminUser,
  USER_STATS_QUERY_KEY,
} from "./use-users"

export interface UpdateUserInput {
  userId: string
  name: string
  email: string
}

export function useUpdateUser(): UseMutationResult<
  void,
  ApiError,
  UpdateUserInput
> {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, UpdateUserInput, { previous: unknown }>({
    mutationFn: async ({ userId, name, email }) => {
      const { error } = await api.PATCH("/users/{userId}", {
        params: { path: { userId } },
        body: { name, email },
      })
      if (error) throw toApiError(error)
    },
    onMutate: async ({ userId, name, email }) => {
      await queryClient.cancelQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
      const previous = queryClient.getQueriesData({
        queryKey: [ADMIN_USERS_QUERY_KEY],
      })
      queryClient.setQueriesData(
        { queryKey: [ADMIN_USERS_QUERY_KEY] },
        (old: { users: AdminUser[] } | undefined) =>
          old
            ? {
                ...old,
                users: old.users.map((u) =>
                  u.id === userId ? { ...u, name, email } : u,
                ),
              }
            : old,
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous as [unknown, unknown][]) {
          queryClient.setQueryData(key as readonly unknown[], data)
        }
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [USER_STATS_QUERY_KEY] })
    },
  })
}
```

> Pontos a confirmar contra o código existente (use `use-suspend-user.ts` como referência canônica e copie a forma exata):
> - O caminho de import do client `api` (em suspend é provavelmente `@/lib/api` ou similar) e a forma de chamar PATCH com path param. O endpoint gerado é `"/users/{userId}"`. Confirme a sintaxe de path param do client com `sg --pattern 'api.PATCH($$$)' --lang tsx apps/frontend/src`.
> - O shape exato dos query keys (`ADMIN_USERS_QUERY_KEY`, `USER_STATS_QUERY_KEY`) e do tipo de dado em cache (`{ users, pagination }`). Copie a forma de optimistic update/rollback usada em `use-suspend-user.ts` para manter consistência (mesma estrutura de `setQueriesData`/contexto).
> - `toApiError` e `ApiError` vêm de `@/lib/errors` (confirmado na pesquisa).

- **Step 4: Rodar e ver passar**

Run: `pnpm --filter frontend test -- --run use-update-user`
Expected: PASS.

- **Step 5: Lint, types**

Run: `pnpm --filter frontend lint:fix` → zero issues
Run: `pnpm --filter frontend tsc:check` → zero erros (o type de `PATCH "/users/{userId}"` deve existir no `@repo/api-types` regenerado na task 5).

- **Step 6: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/features/admin/api/use-update-user.ts \
        apps/frontend/src/features/admin/api/use-update-user.test.tsx
git commit -m "feat(admin): adiciona mutation de edicao de nome/email de usuario"
```

## Critérios de Sucesso

- `useUpdateUser` chama `PATCH /users/:userId` com `{ name, email }`, aplica optimistic update e invalida as query keys corretas (FR-001, FR-003).
- Rollback em erro restaura o cache anterior.
- `lint:fix`, `tsc:check` e o teste da mutation passam.
