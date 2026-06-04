# Task 12: Frontend API hooks — useCheckInMetrics + useRetentionMetrics + useGrowthMetrics [FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-09, task-11

## Visão Geral

Cria os três hooks TanStack Query que buscam dados das APIs de analytics. Dependem dos tipos gerados em task-09 (`@repo/api-types`) e do tipo `PeriodKey` de task-11. Cada hook recebe `period` como argumento e atualiza automaticamente quando o período muda.

## Arquivos

- Create: `apps/frontend/src/features/admin/analytics/api/use-check-in-metrics.ts`
- Create: `apps/frontend/src/features/admin/analytics/api/use-retention-metrics.ts`
- Create: `apps/frontend/src/features/admin/analytics/api/use-growth-metrics.ts`

### Conformidade com as Skills Padrão

- no-workarounds: incluir `period` no `queryKey` para que o TanStack Query revalide automaticamente quando o período muda. Sem isso, trocar o período não recarrega os dados.

## Passos

- **Step 1: Criar use-check-in-metrics.ts**

```typescript
// apps/frontend/src/features/admin/analytics/api/use-check-in-metrics.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { PeriodKey } from "../hooks/use-analytics-period"

type CheckInMetricsResponse =
  paths["/admin/analytics/checkins"]["get"]["responses"][200]["content"]["application/json"]

export const CHECK_IN_METRICS_QUERY_KEY = "admin-analytics-checkins" as const
export const ANALYTICS_STALE_TIME_MS = 60_000

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}

export function useCheckInMetrics(
  period: PeriodKey,
): UseQueryResult<CheckInMetricsResponse, ApiError> {
  return useQuery<CheckInMetricsResponse, ApiError>({
    queryKey: [CHECK_IN_METRICS_QUERY_KEY, period],
    queryFn: async () => {
      const { data, error } = await api.GET("/admin/analytics/checkins", {
        params: { query: { period } },
      })
      if (error || !data) throw toApiError(error)
      return data
    },
    staleTime: ANALYTICS_STALE_TIME_MS,
  })
}
```

- **Step 2: Criar use-retention-metrics.ts**

```typescript
// apps/frontend/src/features/admin/analytics/api/use-retention-metrics.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { PeriodKey } from "../hooks/use-analytics-period"

type RetentionMetricsResponse =
  paths["/admin/analytics/retention"]["get"]["responses"][200]["content"]["application/json"]

export const RETENTION_METRICS_QUERY_KEY = "admin-analytics-retention" as const

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}

export function useRetentionMetrics(
  period: PeriodKey,
): UseQueryResult<RetentionMetricsResponse, ApiError> {
  return useQuery<RetentionMetricsResponse, ApiError>({
    queryKey: [RETENTION_METRICS_QUERY_KEY, period],
    queryFn: async () => {
      const { data, error } = await api.GET("/admin/analytics/retention", {
        params: { query: { period } },
      })
      if (error || !data) throw toApiError(error)
      return data
    },
    staleTime: 60_000,
  })
}
```

- **Step 3: Criar use-growth-metrics.ts**

```typescript
// apps/frontend/src/features/admin/analytics/api/use-growth-metrics.ts
"use client"

import type { paths } from "@repo/api-types"
import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"
import type { PeriodKey } from "../hooks/use-analytics-period"

type GrowthMetricsResponse =
  paths["/admin/analytics/growth"]["get"]["responses"][200]["content"]["application/json"]

export const GROWTH_METRICS_QUERY_KEY = "admin-analytics-growth" as const

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}

export function useGrowthMetrics(
  period: PeriodKey,
): UseQueryResult<GrowthMetricsResponse, ApiError> {
  return useQuery<GrowthMetricsResponse, ApiError>({
    queryKey: [GROWTH_METRICS_QUERY_KEY, period],
    queryFn: async () => {
      const { data, error } = await api.GET("/admin/analytics/growth", {
        params: { query: { period } },
      })
      if (error || !data) throw toApiError(error)
      return data
    },
    staleTime: 60_000,
  })
}
```

- **Step 4: Verificar TypeScript**

```bash
pnpm --filter frontend tsc:check
```

Expected: nenhum erro. Se aparecer erro `Property 'GET' does not exist for '/admin/analytics/...'`, é porque task-09 não foi executada ainda (os tipos não foram gerados). Nesse caso, executar task-09 primeiro.

## Critérios de Sucesso

- `queryKey` inclui `period` como segundo elemento (ex: `["admin-analytics-checkins", "30d"]`)
- `staleTime` de 60 segundos para todos os hooks (dados de analytics mudam lentamente)
- `toApiError` compartilhado localmente em cada hook (padrão do projeto)
- `pnpm --filter frontend tsc:check` passa após task-09 ser executada
