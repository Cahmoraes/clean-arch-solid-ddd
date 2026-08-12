# Task 09: Backend: `GetCurrentWeatherByCityUseCase`

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** standard
**Depends on:** task-04, task-05

## Visão Geral

Implementa o use case de aplicação que orquestra os dois gateways: resolve o nome da cidade em coordenadas via `GeocodingGateway` (task-04) e, com sucesso, busca a temperatura atual via `WeatherGateway` (task-05), combinando `city` (input do usuário) com o `Temperature` retornado em um `CurrentWeather` completo (task-01). Propaga a falha do primeiro gateway que falhar, sem chamar o segundo.

O use case usa `@inject(WEATHER_TYPES...)` para os dois gateways (padrão real do repositório para todo `@injectable()` com dependências). Como este é o primeiro arquivo do módulo `weather` a precisar dos identificadores de serviço, esta task também cria a versão inicial (parcial) de `apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts` — só com as chaves que ela usa (`GATEWAYS.Geocoding`, `GATEWAYS.Weather`, `USE_CASES.GetCurrentWeatherByCity`). A task-10 adiciona a chave `CONTROLLERS.Weather` ao mesmo arquivo; a task-11 (wiring do container) reaproveita o arquivo já completo, sem precisar recriá-lo.

## Arquivos

- Create: `apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts`
- Create: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts`
- Test: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: teste unitário do use case com os fakes de `InMemoryGeocodingGateway`/`InMemoryWeatherGateway`, config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: usa `vi.spyOn` sobre o fake real (não um mock isolado do comportamento) para confirmar que `weatherGateway` nunca é chamado quando o geocoding falha — evita reescrever a lógica do gateway dentro do teste.

## Passos

- **Step 1: Confirmar o padrão de instanciação do use case no teste**

`apps/backend/src/subscription/application/use-case/create-customer.usecase.test.ts` usa `container.snapshot()`/`container.rebind(...)`/`container.get(...)` — mas esse padrão só funciona porque o módulo `subscription` já está registrado no container da aplicação (`subscriptionModule` já carregado). O módulo `weather` só é registrado no container na task-11 (`weatherModule` + `container.load(...)`), que depende desta task-09 — usar o container aqui criaria uma dependência invertida (o `.rebind()` do Inversify exige que o token já esteja `bind`ado, o que só acontece na task-11). Por isso este teste segue o padrão mais simples documentado em `apps/backend/src/subscription/AGENTS.md` (`sut = new CreateSubscriptionUseCase(subscriptionGateway, subscriptionRepository)`): instancia o use case diretamente com `new`, passando os fakes de task-04/task-05 no construtor, sem depender do container Inversify.

- **Step 2: Criar a versão inicial de `weather-types.ts` (sem teste — objeto de constantes puro, sem lógica)**

```ts
// apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts
export const WEATHER_TYPES = {
    GATEWAYS: {
        Geocoding: Symbol.for("GeocodingGateway"),
        Weather: Symbol.for("WeatherGateway"),
    },
    USE_CASES: {
        GetCurrentWeatherByCity: Symbol.for("GetCurrentWeatherByCityUseCase"),
    },
} as const
```

Este arquivo não recebe teste próprio: é um objeto de símbolos (mesmo padrão de `USER_TYPES`/`SUBSCRIPTION_TYPES` na mesma pasta), sem lógica a exercitar — sua correção é validada indiretamente pelos testes que o consomem (este use case, e o `WeatherController` na task-10, que adiciona a chave `CONTROLLERS.Weather` ao mesmo arquivo).

- **Step 3: Escrever o teste que falha para o use case**

```ts
// apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts
import { beforeEach, describe, expect, test, vi } from "vitest"
import { InMemoryGeocodingGateway } from "@/weather/infra/gateway/testing/in-memory-geocoding-gateway"
import { InMemoryWeatherGateway } from "@/weather/infra/gateway/testing/in-memory-weather-gateway"
import { GetCurrentWeatherByCityUseCase } from "./get-current-weather-by-city.usecase"

describe("GetCurrentWeatherByCityUseCase", () => {
    let sut: GetCurrentWeatherByCityUseCase
    let geocodingGateway: InMemoryGeocodingGateway
    let weatherGateway: InMemoryWeatherGateway

    beforeEach(() => {
        geocodingGateway = new InMemoryGeocodingGateway()
        weatherGateway = new InMemoryWeatherGateway()
        sut = new GetCurrentWeatherByCityUseCase(geocodingGateway, weatherGateway)
    })

    test("cidade conhecida + provider ok retorna CurrentWeather completo", async () => {
        const result = await sut.execute({ city: "São Paulo" })

        expect(result.isSuccess()).toBe(true)
        expect(result.force.success().value).toEqual({
            city: "São Paulo",
            temperature: { current: 24, min: 18, max: 27 },
        })
    })

    test("cidade desconhecida falha com CityNotFoundError sem chamar weatherGateway", async () => {
        const getCurrentWeatherSpy = vi.spyOn(weatherGateway, "getCurrentWeather")

        const result = await sut.execute({ city: "Atlantis" })

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe("CityNotFoundError")
        expect(getCurrentWeatherSpy).not.toHaveBeenCalled()
    })

    test("cidade conhecida com provider indisponível falha com WeatherProviderUnavailableError", async () => {
        weatherGateway.simulateProviderUnavailable()

        const result = await sut.execute({ city: "São Paulo" })

        expect(result.isFailure()).toBe(true)
        expect(result.force.failure().value.name).toBe(
            "WeatherProviderUnavailableError",
        )
    })
})
```

- **Step 4: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './get-current-weather-by-city.usecase'` (o arquivo ainda não existe).

- **Step 5: Implementação mínima**

```ts
// apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts
import { inject, injectable } from "inversify"
import { type Either, success } from "@/shared/domain/value-object/either"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types"
import type { GeocodingGateway } from "@/weather/application/gateway/geocoding-gateway"
import type { WeatherGateway } from "@/weather/application/gateway/weather-gateway"
import type { CityNotFoundError } from "@/weather/domain/error/city-not-found-error"
import type { WeatherProviderUnavailableError } from "@/weather/domain/error/weather-provider-unavailable-error"
import type { CurrentWeather } from "@/weather/domain/value-object/current-weather"

export interface GetCurrentWeatherByCityInput {
    city: string
}

@injectable()
export class GetCurrentWeatherByCityUseCase {
    constructor(
        @inject(WEATHER_TYPES.GATEWAYS.Geocoding)
        private readonly geocodingGateway: GeocodingGateway,
        @inject(WEATHER_TYPES.GATEWAYS.Weather)
        private readonly weatherGateway: WeatherGateway,
    ) {}

    async execute(
        input: GetCurrentWeatherByCityInput,
    ): Promise<Either<CityNotFoundError | WeatherProviderUnavailableError, CurrentWeather>> {
        const coordinateOrError = await this.geocodingGateway.geocode(input.city)
        if (coordinateOrError.isFailure()) {
            return coordinateOrError
        }
        const temperatureOrError = await this.weatherGateway.getCurrentWeather(
            coordinateOrError.value,
        )
        if (temperatureOrError.isFailure()) {
            return temperatureOrError
        }
        return success({
            city: input.city,
            temperature: temperatureOrError.value,
        })
    }
}
```

- **Step 6: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- **Step 7: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts
git commit -m "feat(weather): add GetCurrentWeatherByCityUseCase"
```

## Critérios de Sucesso

- Cidade conhecida + provider ok: `execute({city: "São Paulo"})` retorna `isSuccess()` com `CurrentWeather` completo (`city`, `temperature.current/min/max`).
- Cidade desconhecida: `execute(...)` retorna `isFailure()` com `CityNotFoundError`, e `weatherGateway.getCurrentWeather` nunca é chamado.
- Cidade conhecida + `simulateProviderUnavailable()`: `execute(...)` retorna `isFailure()` com `WeatherProviderUnavailableError`.
- `WEATHER_TYPES` existe com `GATEWAYS.Geocoding`, `GATEWAYS.Weather` e `USE_CASES.GetCurrentWeatherByCity`, consumido pelo `@inject` do use case.
