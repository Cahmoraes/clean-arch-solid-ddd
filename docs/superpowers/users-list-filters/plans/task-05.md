# Task 5: Backend — Estender FetchUsersController com params role/status [RF-017, RF-018, RF-019, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Adiciona `role` e `status` como query params opcionais no schema Zod do `FetchUsersController`, repassa ao use case e adiciona testes business-flow para os novos filtros.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/fetch-users.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: usar Zod nativo — sem validações manuais
- test-antipatterns: testes adicionais, não substituição dos existentes

## Passos

- [ ] **Step 1: Atualizar o schema Zod e o callback em FetchUsersController**

Substitua o conteúdo de `apps/backend/src/user/infra/controller/fetch-users.controller.ts`:

```typescript
import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import {
  MimeType,
  PresenterFactory,
} from "@/shared/infra/presenter/presenter-factory"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { FetchUsersUseCase } from "@/user/application/use-case/fetch-users.usecase"
import { UserRoutes } from "./routes/user-routes"

const fetchUsersRequestSchema = z.object({
  limit: z.coerce
    .number()
    .meta({ description: "Number of users per page", example: 10 }),
  page: z.coerce.number().meta({ description: "Page number", example: 1 }),
  query: z
    .string()
    .max(100)
    .optional()
    .meta({ description: "Search by name or email", example: "joao" }),
  role: z
    .enum(["MEMBER", "ADMIN"])
    .optional()
    .meta({ description: "Filter by role", example: "MEMBER" }),
  status: z
    .enum(["active", "inactive"])
    .optional()
    .meta({ description: "Filter by status", example: "active" }),
})

@injectable()
export class FetchUsersController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.FetchUsers)
    private readonly fetchUsers: FetchUsersUseCase,
  ) {
    super()
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "get",
      UserRoutes.FETCH,
      { callback: this.callback, isProtected: true, onlyAdmin: true },
      makeFetchUsersSwaggerSchema(),
    )
  }

  private async callback(req: FastifyRequest, reply: FastifyReply) {
    const parsedQueryParamsOrError = this.parseRequest(
      fetchUsersRequestSchema,
      req.query,
    )
    if (parsedQueryParamsOrError.isFailure()) {
      return this.createResponseError(parsedQueryParamsOrError)
    }

    const { limit, page, query, role, status } = parsedQueryParamsOrError.value
    const result = await this.fetchUsers.execute({ limit, page, query, role, status })
    const users = this.presenter(req.headers.accept).format(result.data)
    if (req.headers.accept === MimeType.CSV) {
      reply.header("Content-Type", MimeType.CSV)
      return ResponseFactory.OK({ body: users })
    }

    return ResponseFactory.OK({
      body: {
        users,
        pagination: result.pagination,
      },
    })
  }

  private presenter(header?: string) {
    return PresenterFactory.create(header)
  }
}

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

const userItemSchema = z.object({
  id: z.uuid().meta({ description: "User ID" }),
  name: z.string().meta({ description: "User full name" }),
  email: z.email().meta({ description: "User email" }),
  role: z.enum(["ADMIN", "MEMBER"]).meta({ description: "User role" }),
  status: z
    .enum(["activated", "suspended"])
    .meta({ description: "User status" }),
  createdAt: z.string().meta({ description: "User creation date" }),
})

const fetchUsersResponseSchema = z.object({
  users: z.array(userItemSchema).meta({ description: "List of users" }),
  pagination: z
    .object({
      total: z.number().meta({ description: "Total number of users" }),
      page: z.number().meta({ description: "Current page" }),
      limit: z.number().meta({ description: "Users per page" }),
    })
    .meta({ description: "Pagination metadata" }),
})

function makeFetchUsersSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "List all users",
    description:
      "Retrieve paginated list of users. Requires authentication and admin role.",
    security: true,
    querystring: fetchUsersRequestSchema,
    responses: {
      200: {
        description: "Users list retrieved successfully",
        schema: fetchUsersResponseSchema,
      },
      400: { description: "Bad Request", schema: errorResponseSchema },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 2: Adicionar testes ao business-flow existente**

Abra `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts` e adicione os seguintes testes ao final do `describe`, antes do `})` de fechamento:

```typescript
test("Deve retornar apenas membros quando role=MEMBER", async () => {
  userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })

  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, role: "MEMBER" })
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-member")
  expect(response.body.pagination.total).toBe(1)
})

test("Deve retornar apenas admins quando role=ADMIN", async () => {
  userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
  userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })

  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, role: "ADMIN" })
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-admin")
})

test("Deve retornar apenas ativos quando status=active", async () => {
  userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
  userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })

  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, status: "active" })
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-active")
})

test("Deve retornar apenas inativos quando status=inactive", async () => {
  userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
  userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })

  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, status: "inactive" })
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-inactive")
})

test("Deve retornar 400 para valor de role inválido", async () => {
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, role: "SUPERUSER" })
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
})
```

- [ ] **Step 3: Rodar os testes business-flow**

```bash
pnpm --filter backend test:business-flow -- -t "Buscar Usuários"
```

Esperado: todos os testes PASS (os existentes e os 5 novos).

- [ ] **Step 4: Verificar tipos, lint e build**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix && pnpm --filter backend build
```

Esperado: zero erros.

## Critérios de Sucesso

- `GET /users?role=MEMBER` retorna somente membros
- `GET /users?role=ADMIN` retorna somente admins
- `GET /users?status=active` retorna somente ativos
- `GET /users?status=inactive` retorna somente inativos
- `GET /users?role=SUPERUSER` retorna 400
- Comportamento sem filtros preservado (RF-019)
- 5 novos testes business-flow passando
- `tsc:check`, `biome:fix` e `build` passam
