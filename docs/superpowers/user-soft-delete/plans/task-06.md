# Task 6: `DeleteUserController` + rota `DELETE /users/:userId` + IoC + bootstrap [RF-011, RF-012, RF-013, RF-014]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-05

## Visão Geral

Expõe o `DeleteUserUseCase` como rota administrativa `DELETE /users/:userId` (`isProtected: true`, `onlyAdmin: true`). O `userId` vem do path param; o `requesterId` vem de `req.user.sub.id` (JWT, RF-013), nunca do corpo. Mapeia os erros de negócio para HTTP: `CannotDeleteSelfError`/`UserIsSuperAdminError` → 403, `UserNotFoundError` → 404, sucesso → 204 (No Content). Registra binding no container e adiciona o controller ao bootstrap.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/delete-user.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- use skill `zod`: valide o path param com `z.object({ userId: z.string().uuid() })`.
- use skill `create-controller`: siga o padrão estrutural de controller do projeto (BaseController, `init()`, `register`).
- use skill `no-workarounds`: `requesterId` deve vir de `req.user.sub.id`; não aceitar do body.

## Passos

- **Step 1: Adicionar a constante de rota**

Em `apps/backend/src/user/infra/controller/routes/user-routes.ts`, adicione `DELETE` ao objeto `UserRoutes`:

```typescript
  PROMOTE_TO_ADMIN: `${PREFIX}/promote-admin`,
  DEMOTE_FROM_ADMIN: `${PREFIX}/demote-admin`,
  DELETE: `${PREFIX}/:userId`,
```

- **Step 2: Adicionar o símbolo do controller no IoC**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, dentro de `Controllers`, adicione:

```typescript
    DemoteFromAdmin: Symbol.for("DemoteFromAdminController"),
    DeleteUser: Symbol.for("DeleteUserController"),
```

- **Step 3: Criar o controller**

Crie `apps/backend/src/user/infra/controller/delete-user.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
  HandleCallbackResponse,
  HttpServer,
  Schema,
} from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { DeleteUserUseCase } from "@/user/application/use-case/delete-user.usecase"
import { UserRoutes } from "./routes/user-routes"

const deleteUserSchema = z.object({
  userId: z.string().uuid().meta({
    description: "User ID to delete (soft delete)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
})

export class DeleteUserController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.DeleteUser)
    private readonly deleteUser: DeleteUserUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: "✅",
  })
  public async init(): Promise<void> {
    this.httpServer.register(
      "delete",
      UserRoutes.DELETE,
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
        rateLimit: {
          max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
          timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
        },
      },
      makeDeleteUserSwaggerSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) {
      return undefined
    }
    if (
      error.name === "CannotDeleteSelfError" ||
      error.name === "UserIsSuperAdminError"
    ) {
      return ResponseFactory.FORBIDDEN({ message: error.message })
    }
    if (error.name.endsWith("NotFoundError")) {
      return ResponseFactory.NOT_FOUND({ message: error.message })
    }
    return undefined
  }

  public async callback(req: FastifyRequest) {
    const parseParamsResult = this.parseRequest(deleteUserSchema, req.params)
    if (parseParamsResult.isFailure()) {
      return this.createResponseError(parseParamsResult)
    }

    const result = await this.deleteUser.execute({
      userId: parseParamsResult.value.userId,
      requesterId: req.user.sub.id,
    })

    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.NO_CONTENT()
  }
}

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makeDeleteUserSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Soft delete a user",
    description:
      "Logically deletes a user account by ID. Requires admin authentication. Cannot delete self or super admin.",
    security: true,
    params: deleteUserSchema,
    responses: {
      204: { description: "User deleted successfully" },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden", schema: errorResponseSchema },
      404: { description: "Not Found", schema: errorResponseSchema },
    },
  })
}
```

> Antes de finalizar, confirme que `OpenApiSchemaBuilder.build` aceita a chave `params` (procure por `params` em `openapi-schema-builder.ts`). Se a API usar outro nome para path params, ajuste conforme o builder real — não invente a chave.

- **Step 4: Registrar o binding no container**

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, importe o controller e adicione o binding junto aos demais controllers:

```typescript
import { DeleteUserController } from "@/user/infra/controller/delete-user.controller"
```

```typescript
  bind(USER_TYPES.Controllers.DemoteFromAdmin).to(DemoteFromAdminController)
  bind(USER_TYPES.Controllers.DeleteUser).to(DeleteUserController)
```

- **Step 5: Adicionar ao bootstrap**

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicione ao array `controllers`:

```typescript
    resolve(USER_TYPES.Controllers.DemoteFromAdmin),
    resolve(USER_TYPES.Controllers.DeleteUser),
```

- **Step 6: Validar tipos, lint e regra de dependências**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend fit:validate-dependencies`
Expected: zero problemas; nenhuma violação de camada.

- **Step 7: Smoke test da suíte de unidade**

Run: `pnpm --filter backend test:run`
Expected: toda a suíte de unidade continua verde (a rota nova é exercida na task-08).

- **Step 8: Commit**

```bash
git add apps/backend/src/user/infra/controller/delete-user.controller.ts apps/backend/src/user/infra/controller/routes/user-routes.ts apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts apps/backend/src/shared/infra/ioc/module/user/user-module.ts apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat(backend): add DELETE /users/:userId soft delete endpoint"
```

## Critérios de Sucesso

- Rota `DELETE /users/:userId` registrada com `isProtected: true` e `onlyAdmin: true` (RF-011, RF-012).
- `requesterId` derivado de `req.user.sub.id` (RF-013).
- Mapeamento: self/super admin → 403, não encontrado → 404, sucesso → 204 (RF-014).
- Binding e bootstrap atualizados; `fit:validate-dependencies`, `biome:fix`, `tsc:check` e `test:run` passam.
