# Task 07: Backend: `OpenMeteoGeocodingGateway` (adapter real)

**Status:** PENDING
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** standard
**Depends on:** task-04

## Visão Geral

Implementa o adapter real de `GeocodingGateway` que chama a API pública de geocoding do Open-Meteo (`https://geocoding-api.open-meteo.com/v1/search`), envolvendo a chamada HTTP com `CircuitBreaker` + `Retry` (composição inferida dos tipos — sem precedente real no repositório; `Retry` por fora porque é o único cujo `.run()` tem tipagem genérica de args/retorno). Converte uma resposta sem resultados em `CityNotFoundError` (task-01).

## Arquivos

- Create: `apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.ts`
- Test: `apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: mock de `fetch` global com `vi.stubGlobal`/`vi.unstubAllGlobals`, config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: o teste mocka apenas a borda externa (`fetch`), não os métodos internos do gateway (`fetchGeocode`), preservando a lógica real de `geocode`.

## Passos

- **Step 1: Escrever o teste que falha**

```ts
// apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.test.ts
import { afterEach, describe, expect, test, vi } from "vitest"
import { OpenMeteoGeocodingGateway } from "./open-meteo-geocoding-gateway"

describe("OpenMeteoGeocodingGateway", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    test("resolve Coordinate quando a API retorna resultados", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                json: async () => ({
                    results: [{ latitude: -23.5505, longitude: -46.6333 }],
                }),
            })),
        )
        const gateway = new OpenMeteoGeocodingGateway()

        const result = await gateway.geocode("São Paulo")

        expect(result.isSuccess()).toBe(true)
        expect(result.force.success().value.latitude).toBe(-23.5505)
        expect(result.force.success().value.longitude).toBe(-46.6333)
    })

    test("falha com CityNotFoundError quando a API não retorna resultados", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => ({
                json: async () => ({ results: [] }),
            })),
        )
        const gateway = new OpenMeteoGeocodingGateway()

        const result = await gateway.geocode("Atlantis")

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe("CityNotFoundError")
    })
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/open-meteo-geocoding-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './open-meteo-geocoding-gateway'` (o arquivo ainda não existe).

- **Step 3: Implementação mínima**

```ts
// apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.ts
import { injectable } from "inversify"
import { Coordinate } from "@/shared/domain/value-object/coordinate"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import { CircuitBreaker } from "@/shared/infra/gateway/circuit-breaker"
import { Retry } from "@/shared/infra/gateway/retry"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway"
import { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"

interface OpenMeteoGeocodingResponse {
    results?: Array<{ latitude: number; longitude: number }>
}

@injectable()
export class OpenMeteoGeocodingGateway implements GeocodingGateway {
    private readonly baseUrl = "https://geocoding-api.open-meteo.com/v1/search"

    async geocode(
        cityName: string,
    ): Promise<Either<CityNotFoundError, Coordinate>> {
        const breaker = CircuitBreaker.wrap({
            callback: () => this.fetchGeocode(cityName),
            failureThresholdPercentageLimit: 50,
            resetTimeout: 30_000,
        })
        const retry = Retry.wrap({
            callback: () => breaker.run(),
            maxAttempts: 3,
            time: 500,
        })
        const data = (await retry.run()) as OpenMeteoGeocodingResponse
        const first = data.results?.[0]
        if (!first) {
            return failure(new CityNotFoundError(cityName))
        }
        const coordinateOrError = Coordinate.create({
            latitude: first.latitude,
            longitude: first.longitude,
        })
        if (coordinateOrError.isFailure()) {
            return failure(new CityNotFoundError(cityName))
        }
        return success(coordinateOrError.value)
    }

    private async fetchGeocode(
        cityName: string,
    ): Promise<OpenMeteoGeocodingResponse> {
        const url = `${this.baseUrl}?name=${encodeURIComponent(cityName)}&count=1`
        const response = await fetch(url)
        return response.json() as Promise<OpenMeteoGeocodingResponse>
    }
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/open-meteo-geocoding-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  2 passed (2)`.

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.ts apps/backend/src/weather/infra/gateway/open-meteo-geocoding-gateway.test.ts
git commit -m "feat(weather): add OpenMeteoGeocodingGateway adapter"
```

## Critérios de Sucesso

- Com `fetch` mockado retornando `results: [{latitude, longitude}]`, `geocode(...)` retorna `isSuccess()` com a `Coordinate` correta.
- Com `fetch` mockado retornando `results: []` (sem resultados), `geocode(...)` retorna `isFailure()` com `CityNotFoundError`.
- A chamada HTTP real passa por `CircuitBreaker` + `Retry` antes de chegar ao `fetch`.
