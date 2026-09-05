# Task 1: `CurrentWeather` VO passa a incluir `Coordinate` [FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Hoje `GetCurrentWeatherByCityUseCase.execute()` chama `geocodingGateway.geocode(input.city)`,
recebe um `Coordinate` completo (latitude/longitude) mas descarta esse valor ao montar o
`CurrentWeather` retornado — só usa a `Temperature` vinda do `weatherGateway`. Esta task altera
o VO `CurrentWeather` para incluir o `Coordinate` resolvido e propaga esse valor no use case, sem
alterar nenhum contrato HTTP (isso é responsabilidade da Task 2). É a base para o globo 3D
poder animar até a cidade buscada. Mudança aditiva: `weather-gateway.ts`,
`open-meteo-weather-gateway.ts`, `in-memory-weather-gateway.ts` e `weather-module.ts` não
constroem `CurrentWeather` nem dependem da assinatura alterada — não precisam de alteração.

## Arquivos

- Modify: `apps/backend/src/weather/domain/value-object/current-weather.ts`
- Modify: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts`
- Test: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o VO `CurrentWeather` ganha uma propriedade tipada como `Coordinate` (classe do bounded context `shared`); garantir que a composição de tipos (`interface` com propriedade de classe) continua correta e sem `any`.
- `no-workarounds`: a correção correta é propagar o `Coordinate` já retornado por `geocodingGateway.geocode()` — não recriar um `Coordinate` novo a partir de `latitude`/`longitude` soltos nem usar cast/`as` para contornar o tipo.
- `test-antipatterns`: o teste de unidade deve验ificar o valor real de `Coordinate` (via `.latitude`/`.longitude`) devolvido pelo use case, não mockar o próprio `Coordinate` nem testar detalhe de implementação do gateway in-memory.

## Passos

- **Step 1: Write the failing test**

Modifique o teste existente `"cidade conhecida + provider ok retorna CurrentWeather completo"` em
`apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts` para
also verificar o `Coordinate` retornado, usando os valores reais da fixture de
`InMemoryGeocodingGateway` para `"São Paulo"` (`latitude: -23.5505, longitude: -46.6333`,
confirmado lendo `apps/backend/src/weather/infra/gateway/testing/in-memory-geocoding-gateway.ts`):

```typescript
test("cidade conhecida + provider ok retorna CurrentWeather completo", async () => {
	const result = await sut.execute({ city: "São Paulo" })

	expect(result.isSuccess()).toBe(true)
	const currentWeather = result.force.success().value
	expect(currentWeather.city).toBe("São Paulo")
	expect(currentWeather.temperature).toEqual({ current: 24, min: 18, max: 27 })
	expect(currentWeather.coordinate.latitude).toBe(-23.5505)
	expect(currentWeather.coordinate.longitude).toBe(-46.6333)
})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'latitude')`, porque
`CurrentWeather` ainda não tem a propriedade `coordinate`.

- **Step 3: Write minimal implementation**

```typescript
// apps/backend/src/weather/domain/value-object/current-weather.ts
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface Temperature {
	current: number
	min: number
	max: number
}

export interface CurrentWeather {
	city: string
	temperature: Temperature
	coordinate: Coordinate
}
```

```typescript
// apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts
public async execute(
	input: GetCurrentWeatherByCityInput,
): Promise<GetCurrentWeatherByCityOutput> {
	const coordinateOrError = await this.geocodingGateway.geocode(input.city)
	if (coordinateOrError.isFailure()) {
		return failure(coordinateOrError.value)
	}
	const temperatureOrError = await this.weatherGateway.getCurrentWeather(
		coordinateOrError.value,
	)
	if (temperatureOrError.isFailure()) {
		return failure(temperatureOrError.value)
	}
	return success({
		city: input.city,
		temperature: temperatureOrError.value,
		coordinate: coordinateOrError.value,
	})
}
```

(O restante do arquivo — imports, `GetCurrentWeatherByCityInput`, `GetCurrentWeatherByCityOutput`,
o construtor com `@inject` — permanece inalterado.)

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: PASS (todos os 4 testes do describe `GetCurrentWeatherByCityUseCase`, incluindo os 3
que já passavam antes desta mudança).

- **Step 5: Commit**

```bash
git add apps/backend/src/weather/domain/value-object/current-weather.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts
git commit -m "feat(weather): propaga Coordinate resolvida para o CurrentWeather do use case"
```

## Critérios de Sucesso

- `CurrentWeather` expõe `coordinate: Coordinate` além de `city` e `temperature` [FR-004].
- `GetCurrentWeatherByCityUseCase.execute()` retorna, em caso de sucesso, o mesmo `Coordinate`
  que `geocodingGateway.geocode()` resolveu para a cidade buscada (mesma instância, sem
  recriação) [FR-004].
- O teste de unidade `get-current-weather-by-city.usecase.test.ts` cobre o valor de
  `coordinate.latitude`/`coordinate.longitude` para uma cidade conhecida.
- Nenhum outro comportamento do use case (falha por cidade desconhecida, falha por provider
  indisponível) foi alterado — os 3 testes pré-existentes continuam passando sem modificação.
