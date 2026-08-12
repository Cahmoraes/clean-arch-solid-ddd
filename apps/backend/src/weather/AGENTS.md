# Módulo Weather

Bounded context responsável pela consulta de clima atual por nome de cidade: resolve o nome em coordenadas (geocoding) e busca a temperatura atual e as mínimas/máximas do dia via Open-Meteo. Endpoint público, sem cache, sem autenticação.

## Estrutura

```
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
```

## Gateways

Interfaces em `application/gateway/`:

```typescript
export interface GeocodingGateway {
  geocode(cityName: string): Promise<Either<CityNotFoundError, Coordinate>>
}

export interface WeatherGateway {
  getCurrentWeather(coordinate: Coordinate): Promise<Either<WeatherProviderUnavailableError, Temperature>>
}
```

`WeatherGateway` retorna só `Temperature` — não conhece o nome da cidade, só coordenadas. É o use case quem combina `city` (input do usuário) com o `Temperature` retornado.

### Implementações

| Ambiente    | Geocoding                     | Weather                      |
|-------------|--------------------------------|-------------------------------|
| Produção    | `OpenMeteoGeocodingGateway`    | `OpenMeteoWeatherGateway`     |
| Testes      | `InMemoryGeocodingGateway`     | `InMemoryWeatherGateway`      |

Os dois adapters de produção envolvem a chamada HTTP com `CircuitBreaker` + `Retry` (`Retry` por fora, `CircuitBreaker` por dentro). Ambos os gateways mantêm o `CircuitBreaker` como campo de instância persistente (não recriado a cada chamada), com argumentos por chamada passados via closure local — nunca via campo mutável compartilhado, para evitar corrupção de estado sob chamadas concorrentes.

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

```typescript
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
```

## Testes

### Teste de Unidade (use case)

```typescript
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
```

### Teste Business-Flow (controller)

```typescript
container.snapshot()
container.rebind(WEATHER_TYPES.GATEWAYS.Geocoding).toConstantValue(new InMemoryGeocodingGateway())
container.rebind(WEATHER_TYPES.GATEWAYS.Weather).toConstantValue(new InMemoryWeatherGateway())
const fastifyServer = await serverBuildForTest()
// supertest(fastifyServer.server).get('/weather?city=São Paulo')
container.restore()
```
