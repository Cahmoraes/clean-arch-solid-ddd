# Task 4: Adicionar hook `useUpdateProfile` no frontend [RF-006, RF-009, RF-010]

**Status:** PENDING
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Adicionar o hook de mutation `useUpdateProfile()` ao módulo de API do perfil. O hook chama `PATCH /users/me`, invalida a query `profile.me` ao ter sucesso (para refetch automático), e expõe `isPending` para estados de loading.

## Arquivos

- Modify: `apps/frontend/src/features/profile/api/index.ts`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: usar `useMutation` com `onSuccess` para invalidar cache
- test-antipatterns: não mockar o cliente de API — testar o contrato do hook diretamente

## Passos

- [ ] **Step 1: Verificar o tipo do PATCH gerado em `@repo/api-types`**

Confirme que o tipo existe (gerado na Task 3):

```bash
grep -n "patch.*users.*me\|PatchUsersMe\|users/me.*patch" packages/api-types/index.d.ts | head -10
```

Você vai precisar do tipo exato do body para usar no hook. O tipo do body é `{ name: string }` e o response é `{ name: string }`.

- [ ] **Step 2: Adicionar o hook `useUpdateProfile` em `apps/frontend/src/features/profile/api/index.ts`**

Adicione ao arquivo existente os seguintes imports e o hook:

```typescript
import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
```

Substitua o import existente de `useQuery` para incluir `useMutation` e `useQueryClient`:

```typescript
"use client"

import type { paths } from "@repo/api-types"
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

export type Me =
  paths["/users/me"]["get"]["responses"][200]["content"]["application/json"]

export type Metrics =
  paths["/users/me/metrics"]["get"]["responses"][200]["content"]["application/json"]

export type PublicUser =
  paths["/users/{userId}"]["get"]["responses"][200]["content"]["application/json"]

export type UpdateProfileInput =
  paths["/users/me"]["patch"]["requestBody"]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message =
    error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}

export const profileQueryKeys = {
  me: () => ["profile", "me"] as const,
  metrics: () => ["profile", "metrics"] as const,
  user: (userId: string) => ["profile", "user", userId] as const,
}

export function useMe(): UseQueryResult<Me, ApiError> {
  return useQuery<Me, ApiError>({
    queryKey: profileQueryKeys.me(),
    queryFn: async () => {
      const { data, error } = await api.GET("/users/me")
      if (error || !data) throw toApiError(error)
      return data
    },
  })
}

export function useMetrics(): UseQueryResult<Metrics, ApiError> {
  return useQuery<Metrics, ApiError>({
    queryKey: profileQueryKeys.metrics(),
    queryFn: async () => {
      const { data, error } = await api.GET("/users/me/metrics")
      if (error || !data) throw toApiError(error)
      return data
    },
  })
}

export function useUserById(
  userId: string | undefined,
): UseQueryResult<PublicUser, ApiError> {
  return useQuery<PublicUser, ApiError>({
    queryKey: profileQueryKeys.user(userId ?? ""),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        throw new ApiError(400, "missing_user_id", mapStatusToMessage(400))
      }
      const { data, error } = await api.GET("/users/{userId}", {
        params: { path: { userId } },
      })
      if (error || !data) throw toApiError(error)
      return data
    },
  })
}

export function useUpdateProfile(): UseMutationResult<
  { name: string },
  ApiError,
  UpdateProfileInput
> {
  const queryClient = useQueryClient()
  return useMutation<{ name: string }, ApiError, UpdateProfileInput>({
    mutationFn: async (body) => {
      const { data, error } = await api.PATCH("/users/me", { body })
      if (error || !data) throw toApiError(error)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileQueryKeys.me() })
    },
  })
}
```

> **Nota:** se o tipo `UpdateProfileInput` não existir em `@repo/api-types` (geração pode diferir), use `{ name: string }` diretamente como tipo do parâmetro do `mutationFn`.

- [ ] **Step 3: Verificar type-check**

```bash
cd apps/frontend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 4: Rodar lint**

```bash
cd apps/frontend
pnpm lint:fix
```

Esperado: zero erros.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/features/profile/api/index.ts
git commit -m "feat(profile): add useUpdateProfile mutation hook

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `useUpdateProfile()` chama `PATCH /users/me` com `{ name }` [RF-009]
- Em sucesso, invalida a query `["profile", "me"]` para atualização automática [RF-007]
- Exporta `isPending` via objeto retornado pelo `useMutation` [RF-007]
- `tsc:check` sem erros [RF-006, RF-010]
