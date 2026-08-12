# Task 08: Backend: `OpenMeteoWeatherGateway` (adapter real)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Implementa o adapter real de `WeatherGateway` que chama a API pública de previsão do Open-Meteo (`https://api.open-meteo.com/v1/forecast`), envolvendo a chamada HTTP com `CircuitBreaker` + `Retry` (mesma composição inferida usada em task-07). Converte falha de rede/HTTP em `WeatherProviderUnavailableError` (task-01).

## Arquivos

- Create: `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts`
- Test: `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: mock de `fetch` global com `vi.stubGlobal`/`vi.unstubAllGlobals`, config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: o teste mocka apenas a borda externa (`fetch`), não os métodos internos do gateway (`fetchForecast`).

## Passos

- **Step 1: Escrever o teste que falha**

```ts
// apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.test.ts
import { Coordinate } from "@/shared/domain/value-object/coordinate"
import { afterEach, describe, expect, test, vi } from "vitest"
import { OpenMeteoWeatherGateway } from "./open-meteo-weather-gateway"

describe("OpenMeteoWeatherGateway", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    test("resolve Temperature quando a API responde com sucesso", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                ok: true,
                json: async () => ({
                    current: { temperature_2m: 24 },
                    daily: {
                        temperature_2m_max: [27],
                        temperature_2m_min: [18],
                    },
                }),
            })),
        )
        const gateway = new OpenMeteoWeatherGateway()
        const coordinate = Coordinate.create({
            latitude: -23.5505,
            longitude: -46.6333,
        }).force.success().value

        const result = await gateway.getCurrentWeather(coordinate)

        expect(result.isSuccess()).toBe(true)
        expect(result.force.success().value).toEqual({
            current: 24,
            min: 18,
            max: 27,
        })
    })

    test("falha com WeatherProviderUnavailableError quando a API responde com erro", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                ok: false,
                status: 500,
                json: async () => ({}),
            })),
        )
        const gateway = new OpenMeteoWeatherGateway()
        const coordinate = Coordinate.create({
            latitude: -23.5505,
            longitude: -46.6333,
        }).force.success().value

        const result = await gateway.getCurrentWeather(coordinate)

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe(
            "WeatherProviderUnavailableError",
        )
    })
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/open-meteo-weather-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './open-meteo-weather-gateway'` (o arquivo ainda não existe).

- **Step 3: Implementação mínima**

```ts
// apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts
import { injectable } from "inversify"
import type { Coordinate } from "@/shared/domain/value-object/coordinate"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import { CircuitBreaker } from "@/shared/infra/gateway/circuit-breaker"
import { Retry } from "@/shared/infra/gateway/retry"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway"
import { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error"
import type { Temperature } from "@/weather/domain/value-object/current-weather"

interface OpenMeteoForecastResponse {
    current: { temperature_2m: number }
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] }
}

@injectable()
export class OpenMeteoWeatherGateway implements WeatherGateway {
    private readonly baseUrl = "https://api.open-meteo.com/v1/forecast"

    async getCurrentWeather(
        coordinate: Coordinate,
    ): Promise<Either<WeatherProviderUnavailableError, Temperature>> {
        try {
            const breaker = CircuitBreaker.wrap({
                callback: () => this.fetchForecast(coordinate),
                failureThresholdPercentageLimit: 50,
                resetTimeout: 30_000,
            })
            const retry = Retry.wrap({
                callback: () => breaker.run(),
                maxAttempts: 3,
                time: 500,
            })
            const data = await retry.run()
            return success({
                current: data.current.temperature_2m,
                min: data.daily.temperature_2m_min[0],
                max: data.daily.temperature_2m_max[0],
            })
        } catch {
            return failure(new WeatherProviderUnavailableError())
        }
    }

    private async fetchForecast(
        coordinate: Coordinate,
    ): Promise<OpenMeteoForecastResponse> {
        const url =
            `${this.baseUrl}?latitude=${coordinate.latitude}&longitude=${coordinate.longitude}` +
            "&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(
                `Open-Meteo forecast request failed with status ${response.status}`,
            )
        }
        return response.json() as Promise<OpenMeteoForecastResponse>
    }
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/open-meteo-weather-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  2 passed (2)`.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.test.ts
git commit -m "feat(weather): add OpenMeteoWeatherGateway adapter"
```

## Critérios de Sucesso

- Com `fetch` mockado respondendo `ok: true` e o shape real do Open-Meteo, `getCurrentWeather(coordinate)` retorna `isSuccess()` com `{current:24,min:18,max:27}`.
- Com `fetch` mockado respondendo `ok: false` (status 500), `getCurrentWeather(coordinate)` retorna `isFailure()` com `WeatherProviderUnavailableError`.
- A chamada HTTP real passa por `CircuitBreaker` + `Retry` antes de chegar ao `fetch`.
