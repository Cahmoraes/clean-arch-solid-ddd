# Task 1: Gateway Open-Meteo e modelo de domínio com condição, vento, horas e dias [FR-001, FR-004, FR-005]

**Status:** DONE

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

O gateway da Open-Meteo passa a pedir, na mesma requisição, condição, sensação, umidade, vento, as próximas 24 horas e 7 dias, e a entregá-los ao domínio num único `WeatherReport`. O use case repassa o relatório junto de cidade e coordenada. Qualquer dado inconsistente do provedor vira `WeatherProviderUnavailableError`, nunca lista vazia, deslocada ou com `null`.

## Arquivos

- Modify: `apps/backend/src/weather/domain/value-object/current-weather.ts`
- Modify: `apps/backend/src/weather/application/gateway/weather-gateway.ts`
- Modify: `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts`
- Modify: `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.ts`
- Modify: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts`
- Modify: `apps/backend/src/weather/AGENTS.md`
- Test: `apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.test.ts`
- Test: `apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts`
- Test: `apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`

## Interfaces

- **Consome:** N/A
- **Produz:** (em `current-weather.ts`)
  ```ts
  export interface WeatherCondition { code: number; isDay: boolean }
  export interface HourlyForecast { time: string; temperature: number; code: number; isDay: boolean }
  export interface DailyForecast { date: string; min: number; max: number; code: number }
  export interface WindReading { speed: number; directionDegrees: number }
  export interface Temperature { current: number; apparent: number; min: number; max: number }
  export interface WeatherReport {
  	temperature: Temperature; condition: WeatherCondition; humidity: number
  	wind: WindReading; hourly: HourlyForecast[]; daily: DailyForecast[]
  }
  export interface CurrentWeather extends WeatherReport { city: string; coordinate: Coordinate }
  ```
  `WeatherGateway.getCurrentWeather(coordinate: Coordinate): Promise<Either<WeatherProviderUnavailableError, WeatherReport>>`. `GetCurrentWeatherByCityUseCase.execute` devolve `CurrentWeather` (campos do relatório no mesmo nível de `city` e `coordinate`). `InMemoryWeatherGateway` mantém `getCurrentWeather(_coordinate?)`, `simulateProviderUnavailable()`, `setTemperature(temperature: Temperature)` e passa a devolver por padrão: `temperature {current:24, apparent:22, min:18, max:27}`, `condition {code:1, isDay:true}`, `humidity 64`, `wind {speed:12, directionDegrees:45}`, `hourly` com 24 itens de `time` `"2026-10-18T15:00"` até `"2026-10-19T14:00"` (de hora em hora) todos `{temperature:24, code:1, isDay:true}`, `daily` com 7 itens de `date` `"2026-10-18"` até `"2026-10-24"` todos `{min:18, max:27, code:1}`.

### Skills a invocar

- `no-workarounds`: dado inválido do provedor falha de verdade, sem preencher lacunas nem filtrar nulos.
- `typescript-advanced`: modelagem das interfaces do relatório e do tipo da resposta da Open-Meteo.
- `test-antipatterns`: os testes afirmam o relatório traduzido, não o mock de `fetch`.
- `context7`: confirmar na documentação da Open-Meteo os nomes de variáveis e parâmetros.

## Passos

- **Step 1: Confirmar na documentação oficial da Open-Meteo (https://open-meteo.com/en/docs, via `ctx7`) os nomes usados abaixo**

Confirmar: variáveis `current` (`temperature_2m`, `apparent_temperature`, `relative_humidity_2m`, `is_day`, `weather_code`, `wind_speed_10m`, `wind_direction_10m`), `hourly` (`temperature_2m`, `weather_code`, `is_day`), `daily` (`weather_code`, `temperature_2m_max`, `temperature_2m_min`), o parâmetro `forecast_days=7`, que `is_day` vem como 0/1, que `current.time` vem em passos de 15 minutos (`2026-10-18T15:15`) e que o array horário começa à 00:00 local com `timezone=auto`. Se algum nome diferir, usar o nome da documentação no fixture do Step 2 e no gateway.
Expected: lista de nomes confirmados (ou ajustados) antes de escrever qualquer código.

- **Step 2: Write the failing test — traduz o relatório completo (substitui o teste de sucesso atual em `open-meteo-weather-gateway.test.ts`)**

`gateway` e `coordinate` são construídos como nos testes existentes do arquivo.

```ts
function buildForecast() {
	return {
		current: {
			time: "2026-10-18T15:15",
			temperature_2m: 24,
			apparent_temperature: 22,
			relative_humidity_2m: 64,
			is_day: 1,
			weather_code: 1,
			wind_speed_10m: 12,
			wind_direction_10m: 45,
		},
		hourly: {
			time: Array.from({ length: 168 }, (_, i) =>
				new Date(Date.UTC(2026, 9, 18, i)).toISOString().slice(0, 16),
			),
			temperature_2m: Array.from({ length: 168 }, (_, i) => i),
			weather_code: Array.from({ length: 168 }, () => 3),
			is_day: Array.from({ length: 168 }, (_, i) => (i % 24 >= 6 && i % 24 < 18 ? 1 : 0)),
		},
		daily: {
			time: Array.from({ length: 7 }, (_, i) => `2026-10-${18 + i}`),
			weather_code: [1, 2, 3, 45, 61, 71, 95],
			temperature_2m_max: Array.from({ length: 7 }, (_, i) => 27 + i),
			temperature_2m_min: Array.from({ length: 7 }, (_, i) => 18 + i),
		},
	}
}

function stubForecast(body: unknown) {
	const fetchMock = vi.fn(async () => ({ ok: true, json: async () => body }))
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

test("AC-02: deve começar o array horário na hora atual local da cidade e devolver 24 itens em ordem crescente", async () => {
	const fetchMock = stubForecast(buildForecast())

	const report = (await gateway.getCurrentWeather(coordinate)).force.success().value

	expect(report.hourly).toHaveLength(24)
	expect(report.hourly[0]).toEqual({ time: "2026-10-18T15:00", temperature: 15, code: 3, isDay: true })
	expect(report.hourly[9]).toMatchObject({ time: "2026-10-19T00:00", isDay: false })
	expect(report.hourly[23].time).toBe("2026-10-19T14:00")
	const times = report.hourly.map((hour) => hour.time)
	expect(times).toEqual([...times].sort())
	expect(fetchMock).toHaveBeenCalledTimes(1)
})

test("deve traduzir condição, sensação, umidade, vento e os 7 dias do provedor", async () => {
	stubForecast(buildForecast())

	const report = (await gateway.getCurrentWeather(coordinate)).force.success().value

	expect(report.temperature).toEqual({ current: 24, apparent: 22, min: 18, max: 27 })
	expect(report.condition).toEqual({ code: 1, isDay: true })
	expect(report.humidity).toBe(64)
	expect(report.wind).toEqual({ speed: 12, directionDegrees: 45 })
	expect(report.daily).toHaveLength(7)
	expect(report.daily[0]).toEqual({ date: "2026-10-18", min: 18, max: 27, code: 1 })
	expect(report.daily[6]).toEqual({ date: "2026-10-24", min: 24, max: 33, code: 95 })
})
```

- **Step 3: Review Focus: A hora atual (`current.time`) não aparece no array horário da Open-Meteo → falha controlada (503), nunca lista vazia ou deslocada — Write the failing test**

```ts
test("Review Focus: deve falhar com WeatherProviderUnavailableError quando a hora atual não está no array horário", async () => {
	const forecast = buildForecast()
	forecast.current.time = "2026-11-01T15:15"
	stubForecast(forecast)

	const result = await gateway.getCurrentWeather(coordinate)

	expect(result.isFailure()).toBe(true)
	expect(result.force.failure().value.name).toBe("WeatherProviderUnavailableError")
})
```

- **Step 4: Review Focus: Valores `null` em `hourly` ou `daily` vindos da Open-Meteo → falha controlada (503), nunca `NaN` na tela — Write the failing test**

```ts
test.each([
	["hourly", (f: ReturnType<typeof buildForecast>) => { (f.hourly.temperature_2m as (number | null)[])[20] = null }],
	["daily", (f: ReturnType<typeof buildForecast>) => { (f.daily.temperature_2m_max as (number | null)[])[3] = null }],
])("Review Focus: deve falhar com WeatherProviderUnavailableError quando %s traz null", async (_name, corrupt) => {
	const forecast = buildForecast()
	corrupt(forecast)
	stubForecast(forecast)

	const result = await gateway.getCurrentWeather(coordinate)

	expect(result.isFailure()).toBe(true)
	expect(result.force.failure().value.name).toBe("WeatherProviderUnavailableError")
})
```

- **Step 5: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/infra/gateway/open-meteo-weather-gateway.test.ts`
Expected: FAIL — `report.hourly`/`report.condition` são `undefined` (o gateway ainda devolve só `Temperature`).

- **Step 6: Implementar os tipos em `current-weather.ts` e a assinatura em `weather-gateway.ts`**

Tipos exatamente como em `## Interfaces`; `WeatherGateway.getCurrentWeather(coordinate: Coordinate): Promise<Either<WeatherProviderUnavailableError, WeatherReport>>`.

- **Step 7: Implement `private toWeatherReport(response: OpenMeteoForecastResponse): WeatherReport` em `open-meteo-weather-gateway.ts` e estender a URL e `OpenMeteoForecastResponse`**

A URL passa a pedir as variáveis confirmadas no Step 1 mais `forecast_days=7`, mantendo `timezone=auto` e um só `fetch` por consulta. `toWeatherReport` roda dentro do `try` existente de `getCurrentWeather`, depois do `Retry`/`CircuitBreaker` (a falha de validação não é retentada), e lança para virar `failure(new WeatherProviderUnavailableError())`. Regras: o índice inicial é o de `current.time.slice(0, 13) + ":00"` em `hourly.time` (não achar, ou sobrarem menos de 24 itens a partir dele, lança); os 24 itens horários e os 7 diários, e todos os campos escalares de `current`, devem ser números finitos (`null`, ausente ou não finito lança); `is_day` 1/0 vira `true`/`false`; `temperature.min`/`max` vêm de `daily[0]`.

- **Step 8: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/infra/gateway/open-meteo-weather-gateway.test.ts`
Expected: PASS (inclui o teste de falha 500 existente, inalterado).

- **Step 9: Write the failing test — `InMemoryWeatherGateway` devolve o relatório padrão (substitui o teste de sucesso em `in-memory-weather-gateway.test.ts`)**

```ts
test("retorna o relatório padrão completo com sucesso", async () => {
	const gateway = new InMemoryWeatherGateway()
	const coordinate = Coordinate.restore({ latitude: 0, longitude: 0 })

	const report = (await gateway.getCurrentWeather(coordinate)).force.success().value

	expect(report.temperature).toEqual({ current: 24, apparent: 22, min: 18, max: 27 })
	expect(report.condition).toEqual({ code: 1, isDay: true })
	expect(report.humidity).toBe(64)
	expect(report.wind).toEqual({ speed: 12, directionDegrees: 45 })
	expect(report.hourly).toHaveLength(24)
	expect(report.hourly[0]).toEqual({ time: "2026-10-18T15:00", temperature: 24, code: 1, isDay: true })
	expect(report.hourly[23].time).toBe("2026-10-19T14:00")
	expect(report.daily).toHaveLength(7)
	expect(report.daily[6]).toEqual({ date: "2026-10-24", min: 18, max: 27, code: 1 })
})
```

- **Step 10: Write the failing test — use case repassa o relatório (ajustar `cidade conhecida + provider ok retorna CurrentWeather completo` em `get-current-weather-by-city.usecase.test.ts`)**

Substituir a asserção de `currentWeather.temperature` por:

```ts
expect(currentWeather.temperature).toEqual({ current: 24, apparent: 22, min: 18, max: 27 })
expect(currentWeather.condition).toEqual({ code: 1, isDay: true })
expect(currentWeather.hourly).toHaveLength(24)
expect(currentWeather.daily).toHaveLength(7)
```

- **Step 11: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts`
Expected: FAIL — `report.condition` indefinido.
Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: FAIL — `currentWeather.condition` indefinido.

- **Step 12: Implement `InMemoryWeatherGateway` e o use case**

`InMemoryWeatherGateway` guarda um `WeatherReport` com os valores padrão de `## Interfaces`; `setTemperature` substitui só `report.temperature`. O use case devolve `success({ city: input.city, coordinate: coordinateOrError.value, ...report })`.

- **Step 13: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts`
Expected: PASS
Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts`
Expected: PASS

- **Step 14: Atualizar `apps/backend/src/weather/AGENTS.md`**

Trocar a descrição do retorno de `WeatherGateway.getCurrentWeather` (hoje `Temperature`) por `WeatherReport` e listar os campos novos do relatório.

- **Step 15: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/backend/src/weather/domain/value-object/current-weather.ts apps/backend/src/weather/application/gateway/weather-gateway.ts apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.ts apps/backend/src/weather/infra/gateway/open-meteo-weather-gateway.test.ts apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.ts apps/backend/src/weather/infra/gateway/testing/in-memory-weather-gateway.test.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.ts apps/backend/src/weather/application/use-case/get-current-weather-by-city.usecase.test.ts apps/backend/src/weather/AGENTS.md
git commit -m "feat(weather): gateway devolve condição, vento, 24 horas e 7 dias

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- O gateway faz um só `fetch` por consulta e traduz condição, sensação, umidade, vento, 24 horas e 7 dias para o modelo do domínio.
- Hora atual ausente do array horário, e `null` em `hourly`/`daily`, resultam em `WeatherProviderUnavailableError`.
- AC-02 [unit]: WHEN a resposta traz `hourly` THEN a primeira hora é a hora atual local da cidade e são 24 itens em ordem crescente
