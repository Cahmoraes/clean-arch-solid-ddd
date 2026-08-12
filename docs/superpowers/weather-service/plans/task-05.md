# Task 05: Backend: `WeatherGateway` (interface) + `InMemoryWeatherGateway` (fake)

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Define o contrato `WeatherGateway` (resolve a temperatura atual para uma `Coordinate`, ou falha com `WeatherProviderUnavailableError` de task-01) e sua implementação fake `InMemoryWeatherGateway`, usada nos testes do use case (task-09) e do business-flow do controller (task-10) sem depender da API externa Open-Meteo (implementada em task-08). O gateway retorna só `Temperature` — não conhece o nome da cidade, pois recebe apenas coordenadas; é o use case (task-09) quem combina o `city` (input do usuário) com o `Temperature` (deste gateway) para montar um `CurrentWeather` completo.

## Arquivos

- Create: `apps/backend/src/weather/application/gateway/weather-gateway.ts`
- Create: `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.ts`
- Test: `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: escrita do teste unitário da fake, config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: o teste exercita o comportamento público (`getCurrentWeather`, `simulateProviderUnavailable`) do fake, não sua estrutura interna.

## Passos

- **Step 1: Criar a interface `WeatherGateway` (sem teste — contrato puro, sem lógica)**

```ts
// apps/backend/src/weather/application/gateway/weather-gateway.ts
import type { Coordinate } from "@/shared/domain/value-object/coordinate"
import type { Either } from "@/shared/domain/value-object/either"
import type { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error"
import type { Temperature } from "@/weather/domain/value-object/current-weather"

export interface WeatherGateway {
    getCurrentWeather(
        coordinate: Coordinate,
    ): Promise<Either<WeatherProviderUnavailableError, Temperature>>
}
```

Este arquivo não recebe teste: é uma interface TypeScript pura (contrato), sem implementação a exercitar em runtime. A implementação fake abaixo segue o ciclo RED/GREEN normalmente.

- **Step 2: Escrever o teste que falha para `InMemoryWeatherGateway`**

```ts
// apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts
import { describe, expect, test } from "vitest"
import { InMemoryWeatherGateway } from "./in-memory-weather-gateway"

describe("InMemoryWeatherGateway", () => {
    test("retorna a temperatura padrão com sucesso", async () => {
        const gateway = new InMemoryWeatherGateway()

        const result = await gateway.getCurrentWeather()

        expect(result.isSuccess()).toBe(true)
        expect(result.force.success().value).toEqual({
            current: 24,
            min: 18,
            max: 27,
        })
    })

    test("falha com WeatherProviderUnavailableError após simulateProviderUnavailable", async () => {
        const gateway = new InMemoryWeatherGateway()
        gateway.simulateProviderUnavailable()

        const result = await gateway.getCurrentWeather()

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe(
            "WeatherProviderUnavailableError",
        )
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './in-memory-weather-gateway'` (o arquivo ainda não existe).

- **Step 4: Implementação mínima de `InMemoryWeatherGateway`**

```ts
// apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.ts
import { injectable } from "inversify"
import { type Either, failure, success } from "@/shared/domain/value-object/either"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway"
import { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error"
import type { Temperature } from "@/weather/domain/value-object/current-weather"

@injectable()
export class InMemoryWeatherGateway implements WeatherGateway {
    private shouldFail = false
    private temperature: Temperature = { current: 24, min: 18, max: 27 }

    async getCurrentWeather(): Promise<
        Either<WeatherProviderUnavailableError, Temperature>
    > {
        if (this.shouldFail) {
            return failure(new WeatherProviderUnavailableError())
        }
        return success(this.temperature)
    }

    simulateProviderUnavailable(): void {
        this.shouldFail = true
    }

    setTemperature(temperature: Temperature): void {
        this.temperature = temperature
    }
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  2 passed (2)`.

- **Step 6: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/application/gateway/weather-gateway.ts apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.ts apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts
git commit -m "feat(weather): add WeatherGateway interface and in-memory fake"
```

## Critérios de Sucesso

- `WeatherGateway` existe como interface pura, sem teste associado (justificado — contrato sem lógica), e retorna apenas `Temperature` (não `CurrentWeather`).
- `InMemoryWeatherGateway.getCurrentWeather()` retorna `isSuccess()` com `{current:24,min:18,max:27}` por padrão.
- Após `simulateProviderUnavailable()`, `getCurrentWeather()` retorna `isFailure()` com um `WeatherProviderUnavailableError`.
