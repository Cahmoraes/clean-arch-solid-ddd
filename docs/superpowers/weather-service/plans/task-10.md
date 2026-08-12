# Task 10: Backend: `WeatherController` (validação, mapeamento de erro, schema OpenAPI) + rotas + teste business-flow

**Status:** DONE
**PRD:** N/A
**Spec:** ../specs/weather-service-design.md
**Tier:** capable
**Depends on:** task-09

## Visão Geral

Cria o endpoint público `GET /weather?city=`: rotas (`WeatherRoutes`), o `WeatherController` (valida a querystring com Zod, chama `GetCurrentWeatherByCityUseCase` de task-09, mapeia `CityNotFoundError`→404 e `WeatherProviderUnavailableError`→503, expõe o schema OpenAPI via `OpenApiSchemaBuilder`) e o teste business-flow que exercita o endpoint fim a fim via `supertest`.

O `WeatherController` também adiciona a chave `CONTROLLERS.Weather` a `apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts`, criado parcialmente na task-09 (`GATEWAYS.*`, `USE_CASES.GetCurrentWeatherByCity`) — deixando o arquivo com o shape final que a task-11 vai consumir sem precisar recriá-lo.

**Importante sobre o teste business-flow desta task:** o wiring de injeção de dependência (`weather-module.ts`, registro em `container.ts`) só é feito na task-11. Até lá, `container.rebind(WEATHER_TYPES.GATEWAYS.Geocoding)` falha porque o token nunca foi `bind`ado. Isso é esperado e documentado no plano: esta task escreve o teste business-flow e confirma que ele falha pela razão certa (binding ausente, não erro de código); a task-11 reexecuta o mesmo teste depois do wiring e confirma que passa (os 4 casos).

## Arquivos

- Create: `apps/backend/src/weather/infra/controller/routes/weather-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts`
- Create: `apps/backend/src/weather/infra/controller/weather-controller.ts`
- Test: `apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `vitest`: teste business-flow com `container.snapshot()`/`rebind`/`restore()` e `supertest`, config `test/vite.config.business-flow.ts`.
- `zod`: schema de querystring (`weatherQuerySchema`) e schemas de resposta/erro para o OpenAPI.
- `test-antipatterns`: o teste business-flow rebinda apenas os gateways (bordas externas), preservando o `WeatherController` e o `GetCurrentWeatherByCityUseCase` reais — nada do fluxo HTTP é mockado.

## Passos

- **Step 1: Confirmar a forma real de `WeatherRoutes`**

`apps/backend/src/contact/infra/http/contact-routes.ts` (rota pública mais próxima de `weather`: sem repositório, um único controller) define as rotas como um `const object` tipado com `as const`, não um `enum`:

```ts
export const ContactRoutes = {
    SEND: "/contact",
} as const
```

`WeatherRoutes` replica exatamente essa forma.

- **Step 2: Confirmar a assinatura real de `mapResponseError`/`createResponseError`**

`apps/backend/src/shared/infra/controller/base-controller.ts` define:

```ts
protected createResponseError(result: Either<ControllerError, unknown>): HandleCallbackResponse
protected mapResponseError(_error: ControllerError): HandleCallbackResponse | undefined
```

com `type ControllerError = Error | Error[]` (tipo local, não exportado). `createResponseError` já trata sucesso (`ResponseFactory.OK`) e delega falha primeiro a `mapResponseError` — se este retornar `undefined`, cai no path genérico (`ZodError`→400, `DomainError`→status por `kind`, senão 500). O controller real `apps/backend/src/user/infra/controller/create-password-reauth-grant.controller.ts` sobrescreve com a assinatura pública `Error | Error[]` (sem importar o tipo interno `ControllerError`) e guarda explicitamente contra `Array.isArray(error) || error instanceof ZodError` antes de checar `error.name`:

```ts
protected override mapResponseError(
    error: Error | Error[],
): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) {
        return undefined
    }
    return this.mapKnownError(error)
}
```

O mesmo controller usa `errorResponseSchema` com `code` **opcional** (`z.string().optional()`), porque o path padrão de erro de validação (`ResponseFactory.BAD_REQUEST({message: ...})`) não inclui `code`. `WeatherController` replica esses dois detalhes (guarda `Array.isArray`/`ZodError`, `code` opcional no schema de erro) — divergem do rascunho inicial do briefing, que omitia a guarda e tornava `code` obrigatório.

- **Step 3: Criar `WeatherRoutes` (sem teste — constante pura, sem lógica)**

```ts
// apps/backend/src/weather/infra/controller/routes/weather-routes.ts
export const WeatherRoutes = {
    GET: "/weather",
} as const
```

- **Step 4: Adicionar `CONTROLLERS.Weather` a `weather-types.ts` (sem teste — objeto de constantes puro)**

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
    CONTROLLERS: {
        Weather: Symbol.for("WeatherController"),
    },
} as const
```

- **Step 5: Escrever o teste business-flow que falha**

```ts
// apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts
import request from "supertest"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { container } from "@/shared/infra/ioc/container"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { InMemoryGeocodingGateway } from "@/weather/infra/gateway/testing/in-memory-geocoding-gateway"
import { InMemoryWeatherGateway } from "@/weather/infra/gateway/testing/in-memory-weather-gateway"

describe("Consultar clima atual por cidade", () => {
    let fastifyServer: FastifyAdapter
    let geocodingGateway: InMemoryGeocodingGateway
    let weatherGateway: InMemoryWeatherGateway

    beforeEach(async () => {
        container.snapshot()
        geocodingGateway = new InMemoryGeocodingGateway()
        weatherGateway = new InMemoryWeatherGateway()
        container
            .rebind(WEATHER_TYPES.GATEWAYS.Geocoding)
            .toConstantValue(geocodingGateway)
        container
            .rebind(WEATHER_TYPES.GATEWAYS.Weather)
            .toConstantValue(weatherGateway)
        fastifyServer = await serverBuildForTest()
        await fastifyServer.ready()
    })

    afterEach(async () => {
        container.restore()
        await fastifyServer.close()
    })

    test("Deve retornar o clima atual para uma cidade conhecida", async () => {
        const response = await request(fastifyServer.server).get(
            "/weather?city=S%C3%A3o%20Paulo",
        )

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(response.body).toEqual({
            city: "São Paulo",
            temperature: { current: 24, min: 18, max: 27 },
        })
    })

    test("Deve retornar 404 para uma cidade desconhecida", async () => {
        const response = await request(fastifyServer.server).get(
            "/weather?city=Atlantis",
        )

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
        expect(response.body).toEqual({
            code: "city_not_found",
            message: "City not found",
        })
    })

    test("Deve retornar 503 quando o provider de clima está indisponível", async () => {
        weatherGateway.simulateProviderUnavailable()

        const response = await request(fastifyServer.server).get(
            "/weather?city=S%C3%A3o%20Paulo",
        )

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
        expect(response.body).toEqual({
            code: "weather_provider_unavailable",
            message: "Weather provider unavailable",
        })
    })

    test("Deve retornar 400 quando city não é informado", async () => {
        const response = await request(fastifyServer.server).get("/weather")

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
})
```

- **Step 6: Rodar o teste e confirmar que falha (controller ainda não existe)**

Run: `pnpm --filter backend exec vitest run src/weather/infra/controller/weather-controller.business-flow-test.ts --config test/vite.config.business-flow.ts`
Expected: FAIL — `container.rebind` lança erro porque `WEATHER_TYPES.GATEWAYS.Geocoding`/`.Weather` ainda não foram `bind`ados no container (nenhum módulo os registrou até aqui).

- **Step 7: Implementação mínima do `WeatherController`**

```ts
// apps/backend/src/weather/infra/controller/weather-controller.ts
import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z, ZodError } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { WEATHER_TYPES } from "@/shared/infra/ioc/module/service-identifier/weather-types"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
    HandleCallbackResponse,
    HttpServer,
    Schema,
} from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { GetCurrentWeatherByCityUseCase } from "@/weather/application/use-case/get-current-weather-by-city.usecase"
import { WeatherRoutes } from "./routes/weather-routes"

const weatherQuerySchema = z.object({
    city: z.string().min(1).meta({ description: "City name", example: "São Paulo" }),
})

const weatherResponseSchema = z.object({
    city: z.string(),
    temperature: z.object({
        current: z.number(),
        min: z.number(),
        max: z.number(),
    }),
})

const errorResponseSchema = z.object({
    code: z.string().optional().meta({ description: "Error code" }),
    message: z.string().meta({ description: "Error message" }),
})

function makeWeatherSwaggerSchema(): Schema {
    return OpenApiSchemaBuilder.build({
        tags: ["weather"],
        summary: "Get current weather by city name",
        description:
            "Public endpoint: resolves a city name to coordinates and returns the current temperature plus the day's min/max.",
        querystring: weatherQuerySchema,
        responses: {
            200: {
                description: "Current weather retrieved successfully",
                schema: weatherResponseSchema,
            },
            400: { description: "Bad Request", schema: errorResponseSchema },
            404: { description: "City not found", schema: errorResponseSchema },
            503: {
                description: "Weather provider unavailable",
                schema: errorResponseSchema,
            },
        },
    })
}

@injectable()
export class WeatherController extends BaseController {
    constructor(
        @inject(SHARED_TYPES.Server.Fastify)
        private readonly httpServer: HttpServer,
        @inject(WEATHER_TYPES.USE_CASES.GetCurrentWeatherByCity)
        private readonly getCurrentWeatherByCity: GetCurrentWeatherByCityUseCase,
    ) {
        super()
        this.callback = this.callback.bind(this)
    }

    @Logger({ message: "✅" })
    public async init(): Promise<void> {
        this.httpServer.register(
            "get",
            WeatherRoutes.GET,
            { callback: this.callback },
            makeWeatherSwaggerSchema(),
        )
    }

    protected override mapResponseError(
        error: Error | Error[],
    ): HandleCallbackResponse | undefined {
        if (Array.isArray(error) || error instanceof ZodError) {
            return undefined
        }
        if (error.name === "CityNotFoundError") {
            return ResponseFactory.NOT_FOUND({
                code: "city_not_found",
                message: "City not found",
            })
        }
        if (error.name === "WeatherProviderUnavailableError") {
            return ResponseFactory.create({
                status: HTTP_STATUS.SERVICE_UNAVAILABLE,
                code: "weather_provider_unavailable",
                message: "Weather provider unavailable",
            })
        }
        return undefined
    }

    private async callback(req: FastifyRequest, _reply: FastifyReply) {
        const parsedQueryOrError = this.parseRequest(weatherQuerySchema, req.query)
        if (parsedQueryOrError.isFailure()) {
            return this.createResponseError(parsedQueryOrError)
        }
        const result = await this.getCurrentWeatherByCity.execute({
            city: parsedQueryOrError.value.city,
        })
        return this.createResponseError(result)
    }
}
```

- **Step 8: Rodar o teste e confirmar que ainda falha (esperado — wiring pendente)**

Run: `pnpm --filter backend exec vitest run src/weather/infra/controller/weather-controller.business-flow-test.ts --config test/vite.config.business-flow.ts`
Expected: FAIL — o `WeatherController` e as rotas já existem e compilam, mas `container.rebind(WEATHER_TYPES.GATEWAYS.Geocoding)` continua lançando "not currently bound", porque nenhum `ContainerModule` associou esses tokens a uma implementação ainda (isso só acontece em `weather-module.ts`, criado na task-11). Este é o resultado esperado e correto para o fim desta task — a task-11 reexecuta este mesmo arquivo de teste depois do wiring e confirma `PASS` nos 4 casos.

- **Step 9: Commit** *(sequential execution only — em uma wave paralela o orquestrador comita na barreira de integração; se este prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/weather/infra/controller/routes/weather-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/weather-types.ts apps/backend/src/weather/infra/controller/weather-controller.ts apps/backend/src/weather/infra/controller/weather-controller.business-flow-test.ts
git commit -m "feat(weather): add WeatherController, routes and business-flow test"
```

## Critérios de Sucesso

- `WeatherRoutes.GET === "/weather"`, no mesmo formato de `const object as const` usado por `ContactRoutes`.
- `WeatherController.mapResponseError` mapeia `CityNotFoundError`→404 (`{code:"city_not_found", message:"City not found"}`) e `WeatherProviderUnavailableError`→503 (`{code:"weather_provider_unavailable", message:"Weather provider unavailable"}`), e delega `ZodError`/arrays ao path padrão de `BaseController` (400).
- O schema OpenAPI do endpoint (`makeWeatherSwaggerSchema`) documenta 200/400/404/503.
- O teste business-flow cobre os 4 casos (200, 404, 503, 400 sem `city`) e falha nesta task só pela ausência do wiring do container (task-11) — não por erro de implementação do controller.
