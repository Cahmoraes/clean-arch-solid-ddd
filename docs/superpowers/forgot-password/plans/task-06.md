# Task 6: Controllers, rotas, rate-limit config e IoC wiring [RF-001, RF-002, RF-007, RF-008, RF-009]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Cria `ForgotPasswordController` e `ResetPasswordController`, adiciona as rotas em `user-routes.ts`, e registra ambos no IoC container e no bootstrap. Os controllers seguem o padrão de `CreateUserController` (zod schema, `BaseController`, OpenAPI schema).

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Create: `apps/backend/src/user/infra/controller/forgot-password.controller.ts`
- Create: `apps/backend/src/user/infra/controller/reset-password.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: siga o padrão de `CreateUserController` exatamente — não invente nova infra

## Passos

- [ ] **Step 1: Adicionar rotas em `user-routes.ts`**

Abra `apps/backend/src/user/infra/controller/routes/user-routes.ts`:

```ts
const PREFIX = "/users"
const PASSWORD_PREFIX = "/password"

export const UserRoutes = {
  CREATE: PREFIX,
  FETCH: PREFIX,
  PROFILE: `${PREFIX}/:userId`,
  ME: `${PREFIX}/me`,
  METRICS: `${PREFIX}/me/metrics`,
  CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
  PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
  PASSWORD: `${PREFIX}/me/password`,
  ACTIVATE_USER: `${PREFIX}/activate`,
  SUSPEND_USER: `${PREFIX}/suspend`,
  FORGOT_PASSWORD: `${PASSWORD_PREFIX}/forgot`,    // NEW  → POST /password/forgot
  RESET_PASSWORD: `${PASSWORD_PREFIX}/reset`,      // NEW  → POST /password/reset
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
```

- [ ] **Step 2: Criar `ForgotPasswordController`**

Crie `apps/backend/src/user/infra/controller/forgot-password.controller.ts`:

```ts
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { ForgotPasswordUseCase } from "@/user/application/use-case/forgot-password.usecase.js"
import { UserRoutes } from "./routes/user-routes.js"

const forgotPasswordRequestSchema = z.object({
  email: z
    .string()
    .email()
    .meta({ description: "E-mail da conta", example: "user@example.com" }),
})

const forgotPasswordResponseSchema = z.object({
  message: z.string().meta({
    description: "Mensagem genérica",
    example: "Se este e-mail estiver cadastrado, você receberá um link em breve.",
  }),
})

export class ForgotPasswordController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.ForgotPassword)
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
  ) {
    super()
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    await this.httpServer.register(
      "post",
      UserRoutes.FORGOT_PASSWORD,
      {
        callback: this.callback,
        rateLimit: {
          max: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX,
          timeWindow: RATE_LIMIT_CONFIG.FORGOT_PASSWORD.TIME_WINDOW,
        },
      },
      makeForgotPasswordSwaggerSchema(),
    )
  }

  private async callback(req: FastifyRequest) {
    const parseResult = this.parseRequest(forgotPasswordRequestSchema, req.body)
    if (parseResult.isFailure()) {
      return this.createResponseError(parseResult)
    }

    await this.forgotPasswordUseCase.execute({
      email: parseResult.value.email,
    })

    return ResponseFactory.OK({
      body: {
        message:
          "Se este e-mail estiver cadastrado, você receberá um link em breve.",
      },
    })
  }
}

function makeForgotPasswordSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Request password reset",
    description:
      "Sends a password reset link to the provided email if it exists. Always returns 200 to prevent email enumeration.",
    body: forgotPasswordRequestSchema,
    responses: {
      200: {
        description: "Request processed (generic response)",
        schema: forgotPasswordResponseSchema,
      },
      400: {
        description: "Invalid request body",
        schema: z.object({ message: z.string() }),
      },
      429: {
        description: "Too many requests",
        schema: z.object({ message: z.string() }),
      },
    },
  })
}
```

- [ ] **Step 3: Criar `ResetPasswordController`**

Crie `apps/backend/src/user/infra/controller/reset-password.controller.ts`:

```ts
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import type { ResetPasswordUseCase } from "@/user/application/use-case/reset-password.usecase.js"
import { UserRoutes } from "./routes/user-routes.js"

const resetPasswordRequestSchema = z.object({
  token: z
    .string()
    .min(1)
    .meta({ description: "Token de reset recebido por email", example: "abc123..." }),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .meta({ description: "Nova senha (mínimo 8 caracteres)", example: "NewPass123!" }),
})

export class ResetPasswordController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.ResetPassword)
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {
    super()
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    await this.httpServer.register(
      "post",
      UserRoutes.RESET_PASSWORD,
      { callback: this.callback },
      makeResetPasswordSwaggerSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ) {
    if (Array.isArray(error)) return undefined
    if (error.name === "InvalidResetTokenError") {
      return ResponseFactory.BAD_REQUEST({
        message: "Token inválido ou expirado. Solicite um novo link de recuperação.",
      })
    }
    return undefined
  }

  private async callback(req: FastifyRequest) {
    const parseResult = this.parseRequest(resetPasswordRequestSchema, req.body)
    if (parseResult.isFailure()) {
      return this.createResponseError(parseResult)
    }

    const result = await this.resetPasswordUseCase.execute({
      token: parseResult.value.token,
      newPassword: parseResult.value.newPassword,
    })

    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.NO_CONTENT()
  }
}

function makeResetPasswordSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Reset password",
    description: "Resets the user password using a valid one-time reset token.",
    body: resetPasswordRequestSchema,
    responses: {
      204: { description: "Password reset successfully" },
      400: {
        description: "Invalid or expired token",
        schema: z.object({ message: z.string() }),
      },
    },
  })
}
```

- [ ] **Step 4: Registrar controllers no `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` e adicione imports:

```ts
import { ForgotPasswordController } from "@/user/infra/controller/forgot-password.controller"
import { ResetPasswordController } from "@/user/infra/controller/reset-password.controller"
```

E dentro do `ContainerModule`:

```ts
bind(USER_TYPES.Controllers.ForgotPassword).to(ForgotPasswordController)
bind(USER_TYPES.Controllers.ResetPassword).to(ResetPasswordController)
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 6: Verificar que o Biome não reporta issues**

```bash
cd apps/backend
pnpm biome:fix
```

Esperado: zero problemas.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/infra/controller/routes/user-routes.ts \
        apps/backend/src/user/infra/controller/forgot-password.controller.ts \
        apps/backend/src/user/infra/controller/reset-password.controller.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts
git commit -m "feat(user): add ForgotPasswordController and ResetPasswordController

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-001: rota `POST /password/forgot` registrada, pública, com rate limit (max 5 / 15min)
- RF-002: controller sempre retorna 200 com mensagem genérica
- RF-007: Fastify responde 429 quando rate limit excedido
- RF-008: rota `POST /password/reset` registrada, pública
- RF-009: controller mapeia `InvalidResetTokenError` → 400
- `pnpm tsc:check` e `pnpm biome:fix` sem erros
