# Task 1: Estender contrato backend de clima com coordenadas [FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

O endpoint `GET /weather` hoje retorna `city` e `temperature`, mas o local já foi resolvido para coordenadas pelo `GeocodingGateway` antes de consultar o clima. Esta task propaga `latitude` e `longitude` do `Coordinate` resolvido até o domínio (`CurrentWeather`), o use case (`GetCurrentWeatherByCityUseCase`) e o contrato HTTP (`WeatherController`, incluindo o schema Zod de resposta e o OpenAPI), para que o frontend receba coordenadas válidas junto do clima.

## Arquivos

- Modify: `apps/backend/src/weather/domain/value-object/current-weather.ts`
- Modify: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts`
- Modify: `apps/backend/src/weather/infra/controller/weather-controller.ts`
- Test: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
- Test: `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts`

Alcance confirmado: a mudança em `CurrentWeather` é aditiva (`latitude`/`longitude` no objeto retornado pelo use case/controller) e não altera o contrato de `WeatherGateway`, que continua retornando `Temperature`; por isso `weather-gateway.ts`, `open-meteo-weather-gateway.ts`, `in-memory-weather-gateway.ts` e o módulo IoC permanecem fora do write-set.

### Conformidade com as Skills Padrão

- `no-workarounds`: não usar `as`/type assertions para forçar `latitude`/`longitude` no retorno; propagar os valores reais vindos de `Coordinate`.
- `test-antipatterns`: os testes devem validar o comportamento observável (payload de resposta e output do use case), não a implementação interna de `InMemoryGeocodingGateway`/`InMemoryWeatherGateway`.
- `typescript-advanced`: `CurrentWeather` e `GetCurrentWeatherByCityOutput` devem expor `latitude`/`longitude` como `number` explícito, sem `any`/`unknown`.
- `zod`: o schema de resposta (`weatherResponseSchema`) e o OpenAPI gerado a partir dele devem declarar `latitude`/`longitude` com `.meta({ description })`.
- `vitest`: testes unitários (`get-current-weather-by-city.usecase.test.ts`) e de fluxo de negócio (`weather-controller.business-flow-test.ts`) cobrindo o novo campo.

## Passos

- **Step 1: Write the failing test (use case)**

```ts
// apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts
	test("cidade conhecida + provider ok retorna latitude e longitude do local resolvido", async () => {
		const result = await sut.execute({ city: "São Paulo" })

		expect(result.isSuccess()).toBe(true)
		expect(result.force.success().value).toEqual({
			city: "São Paulo",
			temperature: { current: 24, min: 18, max: 27 },
			latitude: -23.5505,
			longitude: -46.6333,
		})
	})
```

Adicione este `test` dentro do `describe("GetCurrentWeatherByCityUseCase", ...)` já existente, mantendo os demais testes do arquivo.

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: FAIL — o teste novo falha porque o objeto retornado não contém `latitude`/`longitude` (o teste `"cidade conhecida + provider ok retorna CurrentWeather completo"` já existente continua passando).

- **Step 3: Write minimal implementation (domínio e use case)**

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
	latitude: number
	longitude: number
}
```

```ts
// apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts
		return success({
			city: input.city,
			temperature: temperatureOrError.value,
			latitude: coordinateOrError.value.latitude,
			longitude: coordinateOrError.value.longitude,
		})
```

Essa é a única mudança de comportamento no use case: `coordinateOrError.value` já é o `Coordinate` resolvido pelo `GeocodingGateway.geocode`, com getters `latitude`/`longitude` (ver `apps/backend/src/shared/domain/value-object/coordinate.ts`).

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: PASS (5 tests)

- **Step 5: Write the failing test (contrato HTTP)**

```ts
// apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts
	test("Deve retornar latitude e longitude junto do clima para uma cidade conhecida", async () => {
		const response = await request(fastifyServer.server).get(
			"/weather?city=S%C3%A3o%20Paulo",
		)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body).toEqual({
			city: "São Paulo",
			temperature: { current: 24, min: 18, max: 27 },
			latitude: -23.5505,
			longitude: -46.6333,
		})
	})
```

Adicione este `test` dentro do `describe("Consultar clima atual por cidade", ...)` já existente. O teste `"Deve retornar o clima atual para uma cidade conhecida"` (linha anterior) deve ser atualizado para o mesmo `expect(response.body).toEqual(...)` com `latitude`/`longitude`, já que passa a ser o mesmo payload.

- **Step 6: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: FAIL — o corpo da resposta HTTP não contém `latitude`/`longitude` porque `weatherResponseSchema` ainda não declara esses campos (o Zod de resposta filtra/serializa apenas os campos declarados no schema).

- **Step 7: Write minimal implementation (schema Zod e controller)**

```ts
// apps/backend/src/weather/infra/controller/weather-controller.ts
const weatherResponseSchema = z.object({
	city: z.string().meta({ description: "City name" }),
	temperature: z
		.object({
			current: z.number().meta({ description: "Current temperature" }),
			min: z.number().meta({ description: "Minimum temperature" }),
			max: z.number().meta({ description: "Maximum temperature" }),
		})
		.meta({ description: "Temperature readings" }),
	latitude: z.number().meta({
		description: "Latitude of the resolved location",
		example: -23.5505,
	}),
	longitude: z.number().meta({
		description: "Longitude of the resolved location",
		example: -46.6333,
	}),
})
```

Nenhuma mudança é necessária em `callback`: `this.createResponseError(result)` já serializa todo o objeto `CurrentWeather` retornado pelo use case (agora incluindo `latitude`/`longitude`), e o schema Zod acima passa a permitir esses campos na resposta documentada/validada.

- **Step 8: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: PASS (5 tests)

- **Step 9: Commit** *(sequential execution only — em wave paralela, pule este passo e reporte os arquivos alterados ao orquestrador.)*

```bash
git add apps/backend/src/weather/domain/value-object/current-weather.ts \
  apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts \
  apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts \
  apps/backend/src/weather/infra/controller/weather-controller.ts \
  apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts
git commit -m "feat(weather): expose latitude/longitude in GET /weather response"
```

## Critérios de Sucesso

- `CurrentWeather` e `GetCurrentWeatherByCityOutput` incluem `latitude` e `longitude` como `number`.
- `GET /weather?city=São Paulo` responde com `latitude: -23.5505` e `longitude: -46.6333` junto de `city`/`temperature`.
- Os testes unitário e de fluxo de negócio cobrem o novo campo e passam isoladamente com os comandos acima.
