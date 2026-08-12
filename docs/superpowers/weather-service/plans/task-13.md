# Task 13: Frontend: hook `useWeatherQuery`

**Status:** PENDING
**PRD:** N/A
**Spec:** ../specs/weather-service-frontend-design.md
**Tier:** standard
**Depends on:** task-12

## Visão Geral

Cria o hook `useWeatherQuery`, que consulta `GET /weather?city=` via o client OpenAPI tipado (`@repo/api-types`, regenerado na task-12), seguindo exatamente o mesmo shape de `apps/frontend/src/features/admin/api/use-user-stats.ts`: `useQuery` tipado com `paths["/weather"]["get"]["responses"][200]["content"]["application/json"]`, erro normalizado como `ApiError`, e `enabled: Boolean(city)` para não disparar a consulta enquanto nenhuma cidade foi buscada.

## Arquivos

- Create: `apps/frontend/src/features/weather/api/use-weather-query.ts`
- Test: `apps/frontend/src/features/weather/api/use-weather-query.test.tsx`
- Modify: `apps/frontend/src/test/msw/handlers.ts`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: `useQuery` com `queryKey` dependente de `city`, `enabled: Boolean(city)` para evitar fetch com input vazio.
- `typescript-advanced`: `WeatherResponse` derivado do tipo gerado `paths["/weather"]["get"]["responses"][200]["content"]["application/json"]`, sem duplicar a forma manualmente.

## Passos

- **Step 1: Adicionar o handler MSW padrão de `/weather`**

`apps/frontend/src/test/msw/handlers.ts` segue o padrão de `http.get(endpoint("/gyms"), ({ request }) => { const url = new URL(request.url); ... })` para handlers que leem querystring. Adicionar, na mesma lista `handlers`:

```ts
// apps/frontend/src/test/msw/handlers.ts (adição ao array `handlers`)
http.get(endpoint("/weather"), ({ request }) => {
    const url = new URL(request.url)
    const city = url.searchParams.get("city") ?? "São Paulo"
    return HttpResponse.json(
        { city, temperature: { current: 24, min: 18, max: 27 } },
        { status: 200 },
    )
}),
```

- **Step 2: Escrever o teste que falha**

```tsx
// apps/frontend/src/features/weather/api/use-weather-query.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useWeatherQuery } from "./use-weather-query"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0, staleTime: 0 },
        },
    })
    return ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
}

describe("useWeatherQuery", () => {
    test("retorna o clima para uma cidade válida", async () => {
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    {
                        city: "São Paulo",
                        temperature: { current: 24, min: 18, max: 27 },
                    },
                    { status: 200 },
                ),
            ),
        )

        const { result } = renderHook(() => useWeatherQuery("São Paulo"), {
            wrapper: wrapper(),
        })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual({
            city: "São Paulo",
            temperature: { current: 24, min: 18, max: 27 },
        })
    })

    test("expõe ApiError com code city_not_found quando o endpoint retorna 404", async () => {
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    { code: "city_not_found", message: "City not found" },
                    { status: 404 },
                ),
            ),
        )

        const { result } = renderHook(() => useWeatherQuery("Atlantis"), {
            wrapper: wrapper(),
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.code).toBe("city_not_found")
    })

    test("expõe ApiError com code weather_provider_unavailable quando o endpoint retorna 503", async () => {
        server.use(
            http.get(`${apiBaseUrl}/weather`, () =>
                HttpResponse.json(
                    {
                        code: "weather_provider_unavailable",
                        message: "Weather provider unavailable",
                    },
                    { status: 503 },
                ),
            ),
        )

        const { result } = renderHook(() => useWeatherQuery("São Paulo"), {
            wrapper: wrapper(),
        })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.code).toBe("weather_provider_unavailable")
    })

    test("não dispara a consulta quando city é null", () => {
        const { result } = renderHook(() => useWeatherQuery(null), {
            wrapper: wrapper(),
        })

        expect(result.current.fetchStatus).toBe("idle")
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend exec vitest run src/features/weather/api/use-weather-query.test.tsx`
Expected: FAIL — `Cannot find module './use-weather-query'` (o arquivo ainda não existe).

- **Step 4: Implementação mínima**

```ts
// apps/frontend/src/features/weather/api/use-weather-query.ts
"use client"

import type { paths } from "@repo/api-types"
import type { UseQueryResult } from "@tanstack/react-query"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiError, mapStatusToMessage } from "@/lib/errors"

type WeatherResponse =
    paths["/weather"]["get"]["responses"][200]["content"]["application/json"]

function toApiError(error: unknown, fallbackStatus = 500): ApiError {
    if (error instanceof ApiError) return error
    const message =
        error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
    return new ApiError(fallbackStatus, "network_error", message)
}

export function useWeatherQuery(
    city: string | null,
): UseQueryResult<WeatherResponse, ApiError> {
    return useQuery<WeatherResponse, ApiError>({
        queryKey: ["weather", city],
        queryFn: async () => {
            const { data, error } = await api.GET("/weather", {
                params: { query: { city: city as string } },
            })
            if (error || !data) throw toApiError(error)
            return data
        },
        enabled: Boolean(city),
    })
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend exec vitest run src/features/weather/api/use-weather-query.test.tsx`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  4 passed (4)`.

- **Step 6: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/weather/api/use-weather-query.ts apps/frontend/src/features/weather/api/use-weather-query.test.tsx apps/frontend/src/test/msw/handlers.ts
git commit -m "feat(weather): add useWeatherQuery hook"
```

## Critérios de Sucesso

- Com uma cidade válida, `useWeatherQuery(city)` retorna `isSuccess: true` e `data` igual ao corpo de `GET /weather`.
- Com resposta 404 do endpoint, `useWeatherQuery(city)` retorna `isError: true` e `error.code === "city_not_found"`.
- Com resposta 503 do endpoint, `useWeatherQuery(city)` retorna `isError: true` e `error.code === "weather_provider_unavailable"`.
- Com `city === null`, a query nem dispara: `fetchStatus === "idle"`.
