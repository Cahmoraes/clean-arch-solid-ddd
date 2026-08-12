# Task 01: Domain layer: `CurrentWeather` VO + `CityNotFoundError` + `WeatherProviderUnavailableError`

**Status:** PENDING
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Cria a camada de domínio do novo bounded context `weather`: o value object puro `CurrentWeather` (sem invariantes, portanto sem teste) e as duas classes de erro de domínio que os gateways e o use case (tasks 04, 05, 09) vão lançar — `CityNotFoundError` (cidade não encontrada no geocoding) e `WeatherProviderUnavailableError` (provider de clima externo indisponível).

## Arquivos

- Create: `apps/backend/src/weather/domain/value-object/current-weather.ts`
- Create: `apps/backend/src/weather/domain/error/city-not-found-error.ts`
- Test: `apps/backend/src/weather/domain/error/city-not-found-error.test.ts`
- Create: `apps/backend/src/weather/domain/error/weather-provider-unavailable-error.ts`
- Test: `apps/backend/src/weather/domain/error/weather-provider-unavailable-error.test.ts`

### Conformidade com as Skills Padrão

- `vitest`: escrita dos dois testes unitários de erro de domínio, seguindo a config `test/vite.config.app-domain.ts`.
- `test-antipatterns`: garante que os testes de `CityNotFoundError`/`WeatherProviderUnavailableError` verificam comportamento observável (`.kind`, `.name`, `.message`) e não reimplementam a classe testada.

## Passos

- **Step 1: Criar o value object `CurrentWeather` (sem teste — tipo puro, sem lógica/invariante)**

```ts
// apps/backend/src/weather/domain/value-object/current-weather.ts
export interface Temperature {
    current: number
    min: number
    max: number
}

export interface CurrentWeather {
    city: string
    temperature: Temperature
}
```

Este arquivo não recebe teste: é uma interface TypeScript pura, sem comportamento, construtor ou invariante a validar — não há nada de observável em runtime para um teste exercitar. As duas classes de erro abaixo, no mesmo diretório de domínio, seguem o ciclo RED/GREEN normalmente porque têm comportamento real (`kind`, `name`, `message` herdados de `DomainError`).

- **Step 2: Escrever o teste que falha para `CityNotFoundError`**

```ts
// apps/backend/src/weather/domain/error/city-not-found-error.test.ts
import { describe, expect, test } from "vitest"
import { CityNotFoundError } from "./city-not-found-error"

describe("CityNotFoundError", () => {
    test("deve expor kind, name e message corretos", () => {
        const error = new CityNotFoundError("Atlantis")

        expect(error.kind).toBe("not-found")
        expect(error.name).toBe("CityNotFoundError")
        expect(error.message).toBe("City not found: Atlantis")
    })
})
```

- **Step 3: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/domain/error/city-not-found-error.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './city-not-found-error'` (o arquivo `city-not-found-error.ts` ainda não existe).

- **Step 4: Implementação mínima de `CityNotFoundError`**

```ts
// apps/backend/src/weather/domain/error/city-not-found-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class CityNotFoundError extends DomainError {
    public readonly kind = "not-found" as const

    constructor(cityName: string, errorOptions?: ErrorOptions) {
        super(`City not found: ${cityName}`, errorOptions)
        this.name = "CityNotFoundError"
    }
}
```

- **Step 5: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/domain/error/city-not-found-error.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  1 passed (1)`.

- **Step 6: Escrever o teste que falha para `WeatherProviderUnavailableError`**

```ts
// apps/backend/src/weather/domain/error/weather-provider-unavailable-error.test.ts
import { describe, expect, test } from "vitest"
import { WeatherProviderUnavailableError } from "./weather-provider-unavailable-error"

describe("WeatherProviderUnavailableError", () => {
    test("deve expor name e message corretos", () => {
        const error = new WeatherProviderUnavailableError()

        expect(error.name).toBe("WeatherProviderUnavailableError")
        expect(error.message).toBe("Weather provider unavailable")
    })
})
```

- **Step 7: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend exec vitest run src/weather/domain/error/weather-provider-unavailable-error.test.ts --config test/vite.config.app-domain.ts`
Expected: FAIL — `Cannot find module './weather-provider-unavailable-error'` (o arquivo ainda não existe).

- **Step 8: Implementação mínima de `WeatherProviderUnavailableError`**

```ts
// apps/backend/src/weather/domain/error/weather-provider-unavailable-error.ts
import { DomainError } from "@/shared/domain/error/domain-error.js"

export class WeatherProviderUnavailableError extends DomainError {
    // kind é exigido pela classe base mas não é usado para decidir o status HTTP:
    // WeatherController.mapResponseError() (task-10) sempre intercepta este erro antes
    // do mapeamento genérico por kind (nenhum ErrorKind existente corresponde a 503).
    public readonly kind = "conflict" as const

    constructor(errorOptions?: ErrorOptions) {
        super("Weather provider unavailable", errorOptions)
        this.name = "WeatherProviderUnavailableError"
    }
}
```

- **Step 9: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend exec vitest run src/weather/domain/error/weather-provider-unavailable-error.test.ts --config test/vite.config.app-domain.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  1 passed (1)`.

- **Step 10: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/domain/value-object/current-weather.ts apps/backend/src/weather/domain/error/city-not-found-error.ts apps/backend/src/weather/domain/error/city-not-found-error.test.ts apps/backend/src/weather/domain/error/weather-provider-unavailable-error.ts apps/backend/src/weather/domain/error/weather-provider-unavailable-error.test.ts
git commit -m "feat(weather): add CurrentWeather VO and domain errors"
```

## Critérios de Sucesso

- `CurrentWeather`/`Temperature` existem como tipos puros em `apps/backend/src/weather/domain/value-object/current-weather.ts`, sem teste associado (justificado — tipo sem invariante).
- `new CityNotFoundError("Atlantis")` expõe `.kind === "not-found"`, `.name === "CityNotFoundError"` e `.message === "City not found: Atlantis"`, coberto por teste unitário.
- `new WeatherProviderUnavailableError()` expõe `.name === "WeatherProviderUnavailableError"` e `.message === "Weather provider unavailable"`, coberto por teste unitário.
- Ambos os testes passam isoladamente via `vitest run <arquivo> --config test/vite.config.app-domain.ts`.
