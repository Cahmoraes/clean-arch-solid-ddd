# Task 04: Backend: `GeocodingGateway` (interface) + `InMemoryGeocodingGateway` (fake)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Define o contrato `GeocodingGateway` (resolve um nome de cidade em `Coordinate`, ou falha com `CityNotFoundError` de task-01) e sua implementação fake `InMemoryGeocodingGateway`, usada nos testes do use case (task-09) e do business-flow do controller (task-10) sem depender da API externa Open-Meteo (implementada em task-07).

## Arquivos

- Create: `apps/backend/src/weather/application/gateway/geocoding-gateway.ts`
- Create: `apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.ts`
- Test: `apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: escrita do teste unitário da fake, config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: o teste exercita o comportamento público (`geocode`) do fake, não sua estrutura interna (`knownCities`).

## Passos

- **Step 1: Criar a interface `GeocodingGateway` (sem teste — contrato puro, sem lógica)**

```ts
// apps/backend/src/weather/application/gateway/geocoding-gateway.ts
import type { Coordinate } from "@/shared/domain/value-object/coordinate"
import type { Either } from "@/shared/domain/value-object/either"
import type { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"

export interface GeocodingGateway {
    geocode(cityName: string): Promise<Either<CityNotFoundError, Coordinate>>
}
```

Este arquivo não recebe teste: é uma interface TypeScript pura (contrato), sem implementação a exercitar em runtime. A implementação fake abaixo, que de fato tem comportamento observável, segue o ciclo RED/GREEN normalmente.

- **Step 2: Escrever o teste que falha para `InMemoryGeocodingGateway`**

```ts
// apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.test.ts
import { describe, expect, test } from "vitest"
import { InMemoryGeocodingGateway } from "./in-memory-geocoding-gateway"

describe("InMemoryGeocodingGateway", () => {
    test("resolve uma cidade conhecida em Coordinate", async () => {
        const gateway = new InMemoryGeocodingGateway()

        const result = await gateway.geocode("São Paulo")

        expect(result.isSuccess()).toBe(true)
        expect(result.force.success().value.latitude).toBe(-23.5505)
    })

    test("falha com CityNotFoundError para uma cidade desconhecida", async () => {
        const gateway = new InMemoryGeocodingGateway()

        const result = await gateway.geocode("Atlantis")

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe("CityNotFoundError")
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/testing/in-memory-geocoding-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './in-memory-geocoding-gateway'` (o arquivo ainda não existe).

- **Step 4: Implementação mínima de `InMemoryGeocodingGateway`**

```ts
// apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.ts
import { injectable } from "inversify"
import { Coordinate } from "@/shared/domain/value-object/coordinate"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway"
import { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"

@injectable()
export class InMemoryGeocodingGateway implements GeocodingGateway {
    private readonly knownCities = new Map<
        string,
        { latitude: number; longitude: number }
    >([["São Paulo", { latitude: -23.5505, longitude: -46.6333 }]])

    async geocode(
        cityName: string,
    ): Promise<Either<CityNotFoundError, Coordinate>> {
        const coords = this.knownCities.get(cityName)
        if (!coords) {
            return failure(new CityNotFoundError(cityName))
        }
        const coordinateOrError = Coordinate.create(coords)
        if (coordinateOrError.isFailure()) {
            return failure(new CityNotFoundError(cityName))
        }
        return success(coordinateOrError.value)
    }

    registerCity(
        cityName: string,
        coords: { latitude: number; longitude: number },
    ): void {
        this.knownCities.set(cityName, coords)
    }
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/testing/in-memory-geocoding-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  2 passed (2)`.

- **Step 6: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/application/gateway/geocoding-gateway.ts apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.ts apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.test.ts
git commit -m "feat(weather): add GeocodingGateway interface and in-memory fake"
```

## Critérios de Sucesso

- `GeocodingGateway` existe como interface pura, sem teste associado (justificado — contrato sem lógica).
- `InMemoryGeocodingGateway.geocode("São Paulo")` retorna `isSuccess()` com uma `Coordinate` cujo `.latitude === -23.5505`.
- `InMemoryGeocodingGateway.geocode("Atlantis")` retorna `isFailure()` com um `CityNotFoundError`.
- `registerCity` permite registrar novas cidades conhecidas em tempo de teste, sem alterar a API pública `geocode`.
