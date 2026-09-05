# Task 2: `weatherResponseSchema` expõe `latitude`/`longitude` e regenera `@repo/api-types` [FR-004]

**Status:** DONE
**PRD:** `../prd/prd-weather-globe-clima.md`
**Spec:** `../specs/weather-globe-clima-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Depois da Task 1, `CurrentWeather` já carrega o `Coordinate` resolvido, mas o endpoint HTTP
`GET /weather` ainda não expõe latitude/longitude: `WeatherController.callback()` repassa
`result` (um `Either<Error, CurrentWeather>`) direto para `createResponseError`, que serializa o
corpo via `ResponseFactory.OK({ body: result.value })`. O Fastify então serializa a resposta
estritamente conforme `weatherResponseSchema` (fast-json-stringify) — qualquer campo fora do
schema é descartado silenciosamente, e o `Coordinate` (`{ latitude, longitude }` aninhado) não
corresponde ao contrato aditivo definido no spec (D3: campos soltos no nível raiz, sem VO
aninhado no HTTP). Esta task: (1) adiciona `latitude`/`longitude` ao `weatherResponseSchema`, (2)
altera `callback()` para montar explicitamente o corpo de resposta achatando
`currentWeather.coordinate.latitude`/`.longitude` para o nível raiz, e (3) regenera
`@repo/api-types` para que o frontend tenha esses campos tipados. Mudança aditiva:
`weather-gateway.ts`, `open-meteo-weather-gateway.ts`, `in-memory-weather-gateway.ts` e
`weather-module.ts` não constroem `CurrentWeather` nem dependem da assinatura alterada — não
precisam de alteração.

## Arquivos

- Modify: `apps/backend/src/weather/infra/controller/weather-controller.ts`
- Test: `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts`
- Modify (gerado): `packages/api-types/index.d.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: o novo corpo de resposta é montado como um objeto literal tipado (city, temperature, latitude, longitude) — garantir que a inferência de tipos do `zod` (`weatherResponseSchema`) e o objeto passado para `success()` continuam compatíveis sem `any`.
- `no-workarounds`: a correção correta é achatar `coordinate.latitude`/`coordinate.longitude` explicitamente no `callback()` — não expandir o schema para aceitar um objeto `coordinate` aninhado nem usar `as any` para forçar o Fastify a serializar campos fora do schema.
- `test-antipatterns`: o teste de integração HTTP deve usar os valores reais da fixture `InMemoryGeocodingGateway` (não valores inventados) e verificar o corpo de resposta completo via `toEqual`, não apenas a presença das chaves.

## Passos

- **Step 1: Write the failing test**

Modifique o teste `"Deve retornar o clima atual para uma cidade conhecida"` em
`apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts`:

```typescript
test("Deve retornar o clima atual para uma cidade conhecida", async () => {
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

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: FAIL — `response.body` ainda é `{ city: "São Paulo", temperature: {...} }`, sem
`latitude`/`longitude` (o assert `toEqual` falha por objetos com chaves diferentes).

- **Step 3: Write minimal implementation**

```typescript
// apps/backend/src/weather/infra/controller/weather-controller.ts
// adicionar ao topo, junto dos demais imports:
import {
	success,
} from "@/shared/domain/value-object/either.js"

const weatherResponseSchema = z.object({
	city: z.string().meta({ description: "City name" }),
	temperature: z
		.object({
			current: z.number().meta({ description: "Current temperature" }),
			min: z.number().meta({ description: "Minimum temperature" }),
			max: z.number().meta({ description: "Maximum temperature" }),
		})
		.meta({ description: "Temperature readings" }),
	latitude: z.number().meta({ description: "Latitude of the resolved city" }),
	longitude: z.number().meta({ description: "Longitude of the resolved city" }),
})
```

```typescript
	private async callback(req: FastifyRequest) {
		const parsedQueryOrError = this.parseRequest(weatherQuerySchema, req.query)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.getCurrentWeatherByCity.execute({
			city: parsedQueryOrError.value.city,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		const currentWeather = result.value
		return this.createResponseError(
			success({
				city: currentWeather.city,
				temperature: currentWeather.temperature,
				latitude: currentWeather.coordinate.latitude,
				longitude: currentWeather.coordinate.longitude,
			}),
		)
	}
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/weather/infra/controller/weather-controller.business-flow-test.ts`
Expected: PASS (todos os 5 testes do describe `Consultar clima atual por cidade`).

- **Step 5: Commit**

```bash
git add apps/backend/src/weather/infra/controller/weather-controller.ts apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts
git commit -m "feat(weather): expõe latitude/longitude em GET /weather"
```

- **Step 6: Regenerar `@repo/api-types`**

Run (a partir da raiz do monorepo): `pnpm generate:types`
Expected: `packages/api-types/index.d.ts` é reescrito; o bloco de
`paths["/weather"]["get"]["responses"][200]["content"]["application/json"]` passa a incluir
`latitude: number` e `longitude: number` além de `city` e `temperature`. (O script raiz
`generate:types` já executa `pnpm --filter backend openapi:export` — que roda
`tsx scripts/export-openapi-spec.ts` diretamente sobre o TypeScript fonte, sem exigir uma
compilação prévia do backend — seguido de `pnpm --filter @repo/api-types openapi:generate-client`.)

- **Step 7: Commit dos tipos gerados**

```bash
git add packages/api-types/index.d.ts
git commit -m "chore(api-types): regenera tipos com latitude/longitude de /weather"
```

## Critérios de Sucesso

- `GET /weather?city=<cidade conhecida>` retorna `{ city, temperature, latitude, longitude }` no
  nível raiz do corpo, sem VO aninhado [FR-004].
- O contrato é aditivo: nenhum campo existente (`city`, `temperature`) foi removido ou renomeado
  [FR-004].
- `packages/api-types/index.d.ts` reflete `latitude`/`longitude` no tipo de resposta 200 de
  `/weather`, permitindo que o frontend consuma esses campos tipados a partir da Task 6.
- O teste de integração HTTP (`test:business-flow`) cobre o novo formato de resposta com os
  valores reais da fixture in-memory.
