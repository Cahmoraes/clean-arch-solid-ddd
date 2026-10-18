# Task 2: Contrato HTTP de /weather e regeneração dos tipos [FR-001, FR-008]

**Status:** DONE

**PRD:** `../prd/prd-clima-detalhado.md`

**Spec:** `../specs/clima-detalhado-design.md`

**Tier:** standard

## Visão Geral

O controller de `GET /weather` passa a serializar os campos novos (sensação, condição, umidade, vento, 24 horas e 7 dias) além dos existentes, que não mudam. Em seguida os tipos de `@repo/api-types` são regenerados para o frontend consumir o contrato.

## Arquivos

- Modify: `apps/backend/src/weather/infra/controller/weather-controller.ts`
- Modify: `packages/api-types/index.d.ts` (gerado)
- Test: `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts`

## Interfaces

- **Consome:** `interface CurrentWeather extends WeatherReport { city: string; coordinate: Coordinate }` e os padrões de `InMemoryWeatherGateway` (temperature `{current:24, apparent:22, min:18, max:27}`, condition `{code:1, isDay:true}`, humidity 64, wind `{speed:12, directionDegrees:45}`, hourly de `"2026-10-18T15:00"` a `"2026-10-19T14:00"` com `{temperature:24, code:1, isDay:true}`, daily de `"2026-10-18"` a `"2026-10-24"` com `{min:18, max:27, code:1}`) (task-01).
- **Produz:** o corpo 200 de `GET /weather` com `city`, `temperature {current, apparent, min, max}`, `condition {code, isDay}`, `humidity`, `wind {speed, directionDegrees}`, `hourly[] {time, temperature, code, isDay}`, `daily[] {date, min, max, code}`, `latitude`, `longitude`; em `@repo/api-types`: `paths["/weather"]["get"]["responses"][200]["content"]["application/json"]` com esses campos.

### Skills a invocar

- `zod`: `weatherResponseSchema` com objetos e arrays aninhados e `.meta({ description })`.
- `typescript-advanced`: o tipo gerado é o contrato do frontend.
- `test-antipatterns`: o teste de fluxo afirma o corpo HTTP real, sem mock do controller.

## Passos

- **Step 1: Write the failing test — atualizar `weather-controller.business-flow-test.ts`**

Substituir o `toEqual` do teste "Deve retornar o clima atual para uma cidade conhecida" por:

```ts
test("AC-01: Deve retornar o clima atual com condição, sensação, umidade, vento, 24 horas e 7 dias", async () => {
	const response = await request(fastifyServer.server).get("/weather?city=S%C3%A3o%20Paulo")

	expect(response.status).toBe(HTTP_STATUS.OK)
	expect(response.body).toMatchObject({
		city: "São Paulo",
		latitude: -23.5505,
		longitude: -46.6333,
		temperature: { current: 24, apparent: 22, min: 18, max: 27 },
		condition: { code: 1, isDay: true },
		humidity: 64,
		wind: { speed: 12, directionDegrees: 45 },
	})
	expect(response.body.hourly).toHaveLength(24)
	expect(response.body.hourly[0]).toEqual({ time: "2026-10-18T15:00", temperature: 24, code: 1, isDay: true })
	expect(response.body.hourly[23].time).toBe("2026-10-19T14:00")
	expect(response.body.daily).toHaveLength(7)
	expect(response.body.daily[0]).toEqual({ date: "2026-10-18", min: 18, max: 27, code: 1 })
	expect(response.body.daily[6].date).toBe("2026-10-24")
})
```

Renomear os testes existentes: o de 404 passa a começar com `AC-08: ` ("Deve retornar 404 para uma cidade desconhecida") e o de 503 do provedor de clima com `AC-07: ` (mantendo asserções e o código `weather_provider_unavailable`).

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: FAIL — o corpo não tem `condition` (o Fastify descarta o que não está em `weatherResponseSchema`).

- **Step 3: Estender `weatherResponseSchema` e o `callback` em `weather-controller.ts`**

Campos do schema (cada um com `.meta({ description })`, nos nomes do Contrato): `temperature: z.object({ current, apparent, min, max })` (todos `z.number()`), `condition: z.object({ code: z.number().int(), isDay: z.boolean() })`, `humidity: z.number()`, `wind: z.object({ speed: z.number(), directionDegrees: z.number() })`, `hourly: z.array(z.object({ time: z.string(), temperature: z.number(), code: z.number().int(), isDay: z.boolean() }))`, `daily: z.array(z.object({ date: z.string(), min: z.number(), max: z.number(), code: z.number().int() }))`. O `callback` devolve `ResponseFactory.OK({ body })` com `city`, `temperature`, `condition`, `humidity`, `wind`, `hourly`, `daily`, `latitude: coordinate.latitude`, `longitude: coordinate.longitude`. O mapeamento de erros e o `OpenApiSchemaBuilder.build` ficam como estão.

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: PASS (5 testes).

- **Step 5: Regenerar o OpenAPI e os tipos**

Em `apps/backend`: `pnpm openapi:export` e depois `pnpm openapi:generate-client`.
Run: `git diff --stat packages/api-types/index.d.ts && grep -c "directionDegrees" packages/api-types/index.d.ts`
Expected: o diff altera só `packages/api-types/index.d.ts` e o `grep` imprime um número maior que 0; revisar o diff para confirmar que `apparent`, `condition`, `humidity`, `wind`, `hourly` e `daily` entraram no 200 de `/weather` e que `city`, `temperature.current/min/max`, `latitude` e `longitude` seguem iguais.

- **Step 6: Commit** *(somente quando `workflow.auto_commit` for true; senão, reportar os arquivos)*

```bash
git add apps/backend/src/weather/infra/controller/weather-controller.ts apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts packages/api-types/index.d.ts
git commit -m "feat(weather): expor condição, vento, horas e dias em GET /weather

Claude-Session: https://claude.ai/code/session_01UnzndmG2GmaU644wqVtVC2"
```

## Critérios de Sucesso

- Os campos existentes mantêm nome e significado; os novos aparecem no corpo e nos tipos gerados.
- AC-01 [unit]: WHEN uma cidade é consultada THEN a resposta traz condição, sensação, umidade, vento, 24 horas e 7 dias, além dos campos que já existiam
- AC-07 [unit]: WHEN a Open-Meteo falha THEN a resposta é 503 `weather_provider_unavailable` e a tela mostra o erro de serviço indisponível
- AC-08 [unit]: WHEN a cidade não existe THEN a resposta é 404 `city_not_found`
- | `GET /weather` | `city` (1 a 100 caracteres) | `200` com os campos atuais mais `temperature.apparent`, `condition {code, isDay}`, `humidity`, `wind {speed, directionDegrees}`, `hourly[24] {time, temperature, code, isDay}`, `daily[7] {date, min, max, code}` | `city_not_found` 404; `weather_provider_unavailable` → 503; nenhum novo |
