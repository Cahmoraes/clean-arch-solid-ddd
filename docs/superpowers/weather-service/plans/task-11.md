# Task 11: Backend: injeção de dependência (`weather-module.ts`, `setup-weather-module.ts`) + `AGENTS.md` do módulo

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** standard
**Depends on:** task-07, task-08, task-10

## Visão Geral

Fecha o wiring de injeção de dependência do módulo `weather`: cria o `ContainerModule` (`weather-module.ts`) que liga as interfaces de gateway às implementações reais Open-Meteo (task-07/task-08) e o use case/controller (task-09/task-10), registra o módulo no container global (`container.ts`) e no bootstrap do servidor (`server-build.ts`), e documenta o módulo em `weather/AGENTS.md`. `apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts` já existe e está completo desde a task-10 (criado parcialmente na task-09, completado na task-10) — esta task só o consome, sem recriá-lo.

Esta é uma task de integração/wiring — não há comportamento novo para testar com um ciclo RED/GREEN próprio. A cobertura já existe: o teste business-flow escrito na task-10 (`weather-controller.business-flow-test.ts`) falhava até aqui apenas porque os tokens `WEATHER_TYPES.GATEWAYS.*` nunca haviam sido vinculados no container — esta task aplica cada edição e depois roda esse mesmo teste para confirmar que passa agora com a aplicação real montada.

## Arquivos

- Create: `apps/backend/src/shared/infra/ioc/module/weather/weather-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/container.ts`
- Create: `apps/backend/src/bootstrap/setup-weather-module.ts`
- Modify: `apps/backend/src/bootstrap/server-build.ts`
- Create: `apps/backend/src/weather/AGENTS.md`

### Conformidade com as Skills Padrão

- `vitest`: reexecução do teste business-flow da task-10 para confirmar que o wiring está correto.

## Passos

- **Step 1: Criar o `ContainerModule` do módulo weather**

Chamadas ao Open-Meteo não têm efeito colateral (diferente de Mailer/Stripe), então o binding é direto — sem `Provider`/`toDynamicValue`, ao contrário de `subscriptionModule` (que usa `SubscriptionGatewayProvider.provide` porque a config do Stripe depende de variáveis de ambiente resolvidas em runtime).

```ts
// apps/backend/src/shared/infra/ioc/module/weather/weather-module.ts
import { ContainerModule } from "inversify"
import { GetCurrentWeatherByCityUseCase } from "@/weather/application/use-case/get-current-weather-by-city.usecase"
import { OpenMeteoGeocodingGateway } from "@/weather/infra/gateway/open-meteo-geocoding-gateway"
import { OpenMeteoWeatherGateway } from "@/weather/infra/gateway/open-meteo-weather-gateway"
import { WeatherController } from "@/weather/infra/controller/weather-controller"
import { WEATHER_TYPES } from "../service-identifier/weather-types"

export const weatherModule = new ContainerModule(({ bind }): void => {
    bind(WEATHER_TYPES.GATEWAYS.Geocoding)
        .to(OpenMeteoGeocodingGateway)
        .inSingletonScope()
    bind(WEATHER_TYPES.GATEWAYS.Weather)
        .to(OpenMeteoWeatherGateway)
        .inSingletonScope()
    bind(WEATHER_TYPES.USE_CASES.GetCurrentWeatherByCity).to(
        GetCurrentWeatherByCityUseCase,
    )
    bind(WEATHER_TYPES.CONTROLLERS.Weather).to(WeatherController)
})
```

- **Step 2: Registrar `weatherModule` em `container.ts`**

`apps/backend/src/shared/infra/ioc/container.ts` importa cada módulo e os carrega em `container.load(...)`. Adicionar o import e a entrada de `weatherModule`, seguindo a mesma ordem alfabética/posição usada para `contactModule` (o precedente mais próximo — público, sem repositório):

```ts
// apps/backend/src/shared/infra/ioc/container.ts
import { Container } from "inversify"
import { analyticsModule } from "./module/analytics/analytics-module"
import { checkInModule } from "./module/check-in/check-in-module"
import { contactModule } from "./module/contact/contact-module"
import { gymModule } from "./module/gym/gym-module"
import { healthCheckModule } from "./module/health-check/heath-check-module"
import { infraModule } from "./module/infra/infra-module"
import { notificationModule } from "./module/notification/notification-module"
import { sessionModule } from "./module/session/session-module"
import { subscriptionModule } from "./module/subscription/subscription-module"
import { userModule } from "./module/user/user-module"
import { weatherModule } from "./module/weather/weather-module"

export const container = new Container()
container.load(
    userModule,
    gymModule,
    checkInModule,
    infraModule,
    sessionModule,
    healthCheckModule,
    subscriptionModule,
    notificationModule,
    analyticsModule,
    contactModule,
    weatherModule,
)
```

- **Step 3: Criar `setup-weather-module.ts`**

Padrão simples, igual a `setup-contact-module.ts` — sem workers, sem `await` na chamada em `server-build.ts` (o próprio `setupWeatherModule()` continua síncrono):

```ts
// apps/backend/src/bootstrap/setup-weather-module.ts
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types"
import { type ModuleControllers, resolve } from "./server-build"

export function setupWeatherModule(): ModuleControllers {
    const controllers = [resolve(WEATHER_TYPES.CONTROLLERS.Weather)]
    return { controllers }
}
```

- **Step 4: Registrar `setupWeatherModule` em `server-build.ts`**

`apps/backend/src/bootstrap/server-build.ts` importa cada `setup*Module` e monta o array `modules` dentro de `serverBuild()`. Adicionar o import e a chamada, na mesma posição relativa usada para `setupContactModule()` (sem `await`, mesmo padrão):

```ts
// apps/backend/src/bootstrap/server-build.ts
import type { Controller } from "@/shared/infra/controller/controller"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { Queue } from "@/shared/infra/queue/queue"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

import { setupAnalyticsModule } from "./setup-analytics-module"
import { setupCheckInModule } from "./setup-check-in-module"
import { setupContactModule } from "./setup-contact-module"
import { setupGymModule } from "./setup-gym-module"
import { setupHealthCheckModule } from "./setup-health-check-module"
import { setupNotificationModule } from "./setup-notification-module"
import { setupSessionModule } from "./setup-session-module"
import { setupSubscriptionModule } from "./setup-subscription-module"
import { setupUserModule } from "./setup-user-module"
import { setupWeatherModule } from "./setup-weather-module"

export interface ModuleControllers {
    controllers: Controller[]
    workers?: Controller[]
}

export async function serverBuild() {
    const server = resolve<FastifyAdapter>(SHARED_TYPES.Server.Fastify)
    await server.prepare()
    const queue = resolve<Queue>(SHARED_TYPES.Queue)
    await queue.connect()
    const queueController = resolve(SHARED_TYPES.Controllers.Queue)
    await queueController.init()

    const modules = [
        await setupUserModule(),
        await setupGymModule(),
        await setupCheckInModule(),
        await setupSessionModule(),
        await setupHealthCheckModule(),
        await setupSubscriptionModule(),
        await setupNotificationModule(),
        await setupAnalyticsModule(),
        setupContactModule(),
        setupWeatherModule(),
    ]

    await initializeControllers(modules.flatMap((m) => m.controllers))
    await initializeWorkers(modules.flatMap((m) => m.workers ?? []))

    await queue.publish(EXCHANGES.LOG, {
        message: "Server started",
    })
    return server
}
```

(As funções `initializeControllers`, `initializeWorkers` e `resolve` no restante do arquivo não mudam.)

- **Step 5: Criar `apps/backend/src/weather/AGENTS.md`**

Segue a estrutura de `apps/backend/src/subscription/AGENTS.md` (seções: título, Estrutura, contratos de gateway, use case, rotas HTTP, erros, IoC — Service Identifiers, Testes), adaptada ao módulo `weather` — sem entidade de domínio, repositório nem worker (o VO `CurrentWeather` e os erros de domínio já estão documentados no código de task-01):

```markdown
# Módulo Weather

Bounded context responsável pela consulta de clima atual por nome de cidade: resolve o nome em coordenadas (geocoding) e busca a temperatura atual e as mínimas/máximas do dia via Open-Meteo. Endpoint público, sem cache, sem autenticação.

## Estrutura

\`\`\`
weather/
├── domain/
│   ├── value-object/
│   │   └── current-weather.ts        # CurrentWeather, Temperature (tipos puros)
│   └── error/
│       ├── city-not-found-error.ts
│       └── weather-provider-unavailable-error.ts
├── application/
│   ├── gateway/
│   │   ├── geocoding-gateway.ts      # Interface do gateway de geocoding
│   │   └── weather-gateway.ts        # Interface do gateway de clima
│   └── use-case/
│       └── get-current-weather-by-city.usecase.ts
└── infra/
    ├── gateway/
    │   ├── open-meteo-geocoding-gateway.ts   # Adapter real (CircuitBreaker + Retry)
    │   ├── open-meteo-weather-gateway.ts     # Adapter real (CircuitBreaker + Retry)
    │   └── testing/
    │       ├── in-memory-geocoding-gateway.ts
    │       └── in-memory-weather-gateway.ts
    └── controller/
        ├── weather-controller.ts
        └── routes/
            └── weather-routes.ts
\`\`\`

## Gateways

Interfaces em `application/gateway/`:

\`\`\`typescript
export interface GeocodingGateway {
  geocode(cityName: string): Promise<Either<CityNotFoundError, Coordinate>>
}

export interface WeatherGateway {
  getCurrentWeather(coordinate: Coordinate): Promise<Either<WeatherProviderUnavailableError, Temperature>>
}
\`\`\`

`WeatherGateway` retorna só `Temperature` — não conhece o nome da cidade, só coordenadas. É o use case quem combina `city` (input do usuário) com o `Temperature` retornado.

### Implementações

| Ambiente    | Geocoding                     | Weather                      |
|-------------|--------------------------------|-------------------------------|
| Produção    | `OpenMeteoGeocodingGateway`    | `OpenMeteoWeatherGateway`     |
| Testes      | `InMemoryGeocodingGateway`     | `InMemoryWeatherGateway`      |

Os dois adapters de produção envolvem a chamada HTTP com `CircuitBreaker` + `Retry` (`Retry` por fora, `CircuitBreaker` por dentro).

## Use Case

| Use Case                         | Input           | Output                                                                 |
|-----------------------------------|-----------------|-------------------------------------------------------------------------|
| `GetCurrentWeatherByCityUseCase`  | `{ city }`      | `Either<CityNotFoundError \| WeatherProviderUnavailableError, CurrentWeather>` |

Fluxo: `geocode(city)` → se falhar, propaga `CityNotFoundError` sem chamar o gateway de clima; se OK, `getCurrentWeather(coordinate)` → se falhar, propaga `WeatherProviderUnavailableError`; se OK, combina `city` + `temperature` em `CurrentWeather`.

## Rotas HTTP

| Rota           | Método | Proteção  | Descrição                          |
|-----------------|--------|-----------|--------------------------------------|
| `GET /weather`  | GET    | Pública   | Clima atual por `?city=<nome>`       |

Definidas em `infra/controller/routes/weather-routes.ts`.

## Erros

| Erro                              | HTTP | Código                        |
|------------------------------------|------|--------------------------------|
| `CityNotFoundError`                | 404  | `city_not_found`               |
| `WeatherProviderUnavailableError`  | 503  | `weather_provider_unavailable` |

`WeatherController.mapResponseError` intercepta os dois pelo `error.name`, antes do mapeamento genérico por `kind` de `BaseController` (nenhum `ErrorKind` existente corresponde a 503).

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/weather-types.ts`:

\`\`\`typescript
export const WEATHER_TYPES = {
  GATEWAYS: {
    Geocoding: Symbol.for('GeocodingGateway'),
    Weather: Symbol.for('WeatherGateway'),
  },
  USE_CASES: {
    GetCurrentWeatherByCity: Symbol.for('GetCurrentWeatherByCityUseCase'),
  },
  CONTROLLERS: {
    Weather: Symbol.for('WeatherController'),
  },
} as const
\`\`\`

## Testes

### Teste de Unidade (use case)

\`\`\`typescript
import { InMemoryGeocodingGateway } from '@/weather/infra/gateway/testing/in-memory-geocoding-gateway'
import { InMemoryWeatherGateway } from '@/weather/infra/gateway/testing/in-memory-weather-gateway'
import { GetCurrentWeatherByCityUseCase } from '@/weather/application/use-case/get-current-weather-by-city.usecase'

describe('GetCurrentWeatherByCityUseCase', () => {
  let sut: GetCurrentWeatherByCityUseCase
  let geocodingGateway: InMemoryGeocodingGateway
  let weatherGateway: InMemoryWeatherGateway

  beforeEach(() => {
    geocodingGateway = new InMemoryGeocodingGateway()
    weatherGateway = new InMemoryWeatherGateway()
    sut = new GetCurrentWeatherByCityUseCase(geocodingGateway, weatherGateway)
  })

  test('retorna o clima atual para uma cidade conhecida', async () => {
    const result = await sut.execute({ city: 'São Paulo' })
    expect(result.isSuccess()).toBe(true)
  })
})
\`\`\`

### Teste Business-Flow (controller)

\`\`\`typescript
container.snapshot()
container.rebind(WEATHER_TYPES.GATEWAYS.Geocoding).toConstantValue(new InMemoryGeocodingGateway())
container.rebind(WEATHER_TYPES.GATEWAYS.Weather).toConstantValue(new InMemoryWeatherGateway())
const fastifyServer = await serverBuildForTest()
// supertest(fastifyServer.server).get('/weather?city=São Paulo')
container.restore()
\`\`\`
```

- **Step 6: Rodar o teste business-flow da task-10 e confirmar que agora passa**

Run: `pnpm --filter backend exec vitest run src/weather/infra/controller/weather-controller.business-flow-test.ts --config test/vite.config.business-flow.ts`
Expected: PASS — `Test Files  1 passed (1)`, `Tests  4 passed (4)` (os 4 casos: 200, 404, 503, 400).

- **Step 7: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/shared/infra/ioc/module/weather/weather-module.ts apps/backend/src/shared/infra/ioc/container.ts apps/backend/src/bootstrap/setup-weather-module.ts apps/backend/src/bootstrap/server-build.ts apps/backend/src/weather/AGENTS.md
git commit -m "feat(weather): wire weather module into the IoC container"
```

## Critérios de Sucesso

- `weatherModule` liga `GATEWAYS.Geocoding`→`OpenMeteoGeocodingGateway`, `GATEWAYS.Weather`→`OpenMeteoWeatherGateway`, `USE_CASES.GetCurrentWeatherByCity`→`GetCurrentWeatherByCityUseCase` e `CONTROLLERS.Weather`→`WeatherController`, todos em escopo singleton para os gateways.
- `container.ts` carrega `weatherModule`; `server-build.ts` monta `setupWeatherModule()` e inicializa o `WeatherController`.
- O teste business-flow de `weather-controller.business-flow-test.ts` (criado na task-10) passa nos 4 casos depois deste wiring.
- `apps/backend/src/weather/AGENTS.md` documenta estrutura, gateways, use case, rotas, erros, service identifiers e exemplos de teste do módulo, no mesmo formato de `apps/backend/src/subscription/AGENTS.md`.
