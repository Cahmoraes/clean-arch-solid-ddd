# Task 4: Backend — Rotas, IoC, Controllers, Bindings [RF-001, RF-007, RF-008, RF-013]

**Status:** PENDING
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Registra as novas rotas HTTP, símbolos IoC, controllers e bindings para expor `PromoteToAdminUseCase` e `DemoteFromAdminUseCase` como endpoints protegidos por JWT + onlyAdmin.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/routes/user-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Create: `apps/backend/src/user/infra/controller/promote-to-admin.controller.ts`
- Create: `apps/backend/src/user/infra/controller/demote-from-admin.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: seguir padrão exato dos controllers `activate-user` e `suspend-user`

## Passos

- [ ] **Step 1: Adicionar rotas ao `user-routes.ts`**

Abra `apps/backend/src/user/infra/controller/routes/user-routes.ts`. Adicione as duas novas rotas:

```typescript
const PREFIX = "/users"

export const UserRoutes = {
  CREATE: PREFIX,
  FETCH: PREFIX,
  PROFILE: `${PREFIX}/:userId`,
  ME: `${PREFIX}/me`,
  METRICS: `${PREFIX}/me/metrics`,
  CHANGE_PASSWORD: `${PREFIX}/me/change-password`,
  PASSWORD_REAUTH: `${PREFIX}/me/password/reauth`,
  PASSWORD: `${PREFIX}/me/password`,
  FORGOT_PASSWORD: "/password/forgot",
  RESET_PASSWORD: "/password/reset",
  ACTIVATE_USER: `${PREFIX}/activate`,
  SUSPEND_USER: `${PREFIX}/suspend`,
  PROMOTE_TO_ADMIN: `${PREFIX}/promote-admin`,
  DEMOTE_FROM_ADMIN: `${PREFIX}/demote-admin`,
} as const

export type UserRoutesType = (typeof UserRoutes)[keyof typeof UserRoutes]
```

- [ ] **Step 2: Adicionar símbolos IoC ao `user-types.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`. Adicione `PromoteToAdmin` e `DemoteFromAdmin` em `UseCases` e `Controllers`:

```typescript
export const USER_TYPES = {
  Repositories: {
    User: Symbol.for("UserRepository"),
  },
  PG: {
    User: Symbol.for("PgUserRepository"),
  },
  UseCases: {
    CreateUser: Symbol.for("CreateUserUseCase"),
    UpdateUser: Symbol.for("UpdateUserUseCase"),
    DeleteUser: Symbol.for("DeleteUserUseCase"),
    FetchUsers: Symbol.for("FetchUsersUseCase"),
    UserProfile: Symbol.for("UserProfileUseCase"),
    ChangePassword: Symbol.for("ChangePasswordUseCase"),
    CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
    DefinePassword: Symbol.for("DefinePasswordUseCase"),
    ForgotPassword: Symbol.for("ForgotPasswordUseCase"),
    ResetPassword: Symbol.for("ResetPasswordUseCase"),
    ActivateUser: Symbol.for("ActivateUserUseCase"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileUseCase"),
    SuspendUser: Symbol.for("SuspendUserUseCase"),
    UserMetrics: Symbol.for("UserMetricsUseCase"),
    PromoteToAdmin: Symbol.for("PromoteToAdminUseCase"),
    DemoteFromAdmin: Symbol.for("DemoteFromAdminUseCase"),
  },
  Controllers: {
    CreateUser: Symbol.for("UserController"),
    UserProfile: Symbol.for("UserProfileController"),
    ChangePassword: Symbol.for("ChangePasswordController"),
    CreatePasswordReauthGrant: Symbol.for(
      "CreatePasswordReauthGrantController",
    ),
    DefinePassword: Symbol.for("DefinePasswordController"),
    ForgotPassword: Symbol.for("ForgotPasswordController"),
    ResetPassword: Symbol.for("ResetPasswordController"),
    FetchUsers: Symbol.for("FetchUsersController"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileController"),
    ActivateUser: Symbol.for("ActivateUserController"),
    SuspendUser: Symbol.for("SuspendUserController"),
    MyProfile: Symbol.for("MyProfileController"),
    UserMetrics: Symbol.for("UserMetricsController"),
    PromoteToAdmin: Symbol.for("PromoteToAdminController"),
    DemoteFromAdmin: Symbol.for("DemoteFromAdminController"),
  },
  Gateways: {
    PasswordResetTokenStore: Symbol.for("PasswordResetTokenStore"),
  },
  DAO: {
    User: Symbol.for("UserDAO"),
  },
  Notifications: {
    SendWelcomeEmail: Symbol.for("SendWelcomeEmailNotification"),
    SendPasswordAlertEmail: Symbol.for("SendPasswordAlertEmailNotification"),
    SendPasswordResetEmail: Symbol.for("SendPasswordResetEmailNotification"),
  },
} as const
```

- [ ] **Step 3: Criar `promote-to-admin.controller.ts`**

Crie `apps/backend/src/user/infra/controller/promote-to-admin.controller.ts`:

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
import type { PromoteToAdminUseCase } from "@/user/application/use-case/promote-to-admin.usecase"
import { UserRoutes } from "./routes/user-routes"

const promoteToAdminSchema = z.object({
  userId: z.string().uuid().meta({
    description: "User ID to promote to admin",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
})

export class PromoteToAdminController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.PromoteToAdmin)
    private readonly promoteToAdmin: PromoteToAdminUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "patch",
      UserRoutes.PROMOTE_TO_ADMIN,
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
        rateLimit: {
          max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
          timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
        },
      },
      makePromoteToAdminSwaggerSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) {
      return undefined
    }
    return ResponseFactory.UNPROCESSABLE_ENTITY({ message: error.message })
  }

  public async callback(req: FastifyRequest) {
    const parseBodyResult = this.parseRequest(promoteToAdminSchema, req.body)
    if (parseBodyResult.isFailure()) {
      return this.createResponseError(parseBodyResult)
    }

    const result = await this.promoteToAdmin.execute({
      userId: parseBodyResult.value.userId,
    })

    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.OK()
  }
}

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makePromoteToAdminSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Promote a user to admin",
    description: "Promotes an active member to admin role. Requires admin authentication.",
    security: true,
    body: promoteToAdminSchema,
    responses: {
      200: { description: "User promoted to admin successfully" },
      400: { description: "Bad Request", schema: errorResponseSchema },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      422: { description: "Unprocessable Entity", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 4: Criar `demote-from-admin.controller.ts`**

Crie `apps/backend/src/user/infra/controller/demote-from-admin.controller.ts`:

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
import type { DemoteFromAdminUseCase } from "@/user/application/use-case/demote-from-admin.usecase"
import { UserRoutes } from "./routes/user-routes"

const demoteFromAdminSchema = z.object({
  userId: z.string().uuid().meta({
    description: "User ID to demote from admin",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
})

export class DemoteFromAdminController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.DemoteFromAdmin)
    private readonly demoteFromAdmin: DemoteFromAdminUseCase,
  ) {
    super()
    this.bindMethod()
  }

  private bindMethod() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    this.httpServer.register(
      "patch",
      UserRoutes.DEMOTE_FROM_ADMIN,
      {
        callback: this.callback,
        isProtected: true,
        onlyAdmin: true,
        rateLimit: {
          max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
          timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
        },
      },
      makeDemoteFromAdminSwaggerSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) {
      return undefined
    }
    return ResponseFactory.UNPROCESSABLE_ENTITY({ message: error.message })
  }

  public async callback(req: FastifyRequest) {
    const parseBodyResult = this.parseRequest(demoteFromAdminSchema, req.body)
    if (parseBodyResult.isFailure()) {
      return this.createResponseError(parseBodyResult)
    }

    const result = await this.demoteFromAdmin.execute({
      userId: parseBodyResult.value.userId,
      requesterId: req.user.sub.id,
    })

    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.OK()
  }
}

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makeDemoteFromAdminSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Demote an admin to member",
    description: "Removes admin privileges from a user. Requires admin authentication. Cannot demote self or super admin.",
    security: true,
    body: demoteFromAdminSchema,
    responses: {
      200: { description: "Admin demoted successfully" },
      400: { description: "Bad Request", schema: errorResponseSchema },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      422: { description: "Unprocessable Entity", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 5: Adicionar bindings ao `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`. Adicione os imports e bindings dos novos controllers e use cases (insira ao final do array de bindings, antes do `})`):

Adicione os imports:
```typescript
import { DemoteFromAdminUseCase } from "@/user/application/use-case/demote-from-admin.usecase"
import { PromoteToAdminUseCase } from "@/user/application/use-case/promote-to-admin.usecase"
import { DemoteFromAdminController } from "@/user/infra/controller/demote-from-admin.controller"
import { PromoteToAdminController } from "@/user/infra/controller/promote-to-admin.controller"
```

Adicione os bindings ao final do `ContainerModule` (antes do `})`):
```typescript
bind(USER_TYPES.UseCases.PromoteToAdmin).to(PromoteToAdminUseCase)
bind(USER_TYPES.UseCases.DemoteFromAdmin).to(DemoteFromAdminUseCase)
bind(USER_TYPES.Controllers.PromoteToAdmin).to(PromoteToAdminController)
bind(USER_TYPES.Controllers.DemoteFromAdmin).to(DemoteFromAdminController)
```

- [ ] **Step 6: Registrar controllers no `setup-user-module.ts`**

Abra `apps/backend/src/bootstrap/setup-user-module.ts`. Adicione os dois novos controllers ao array `controllers`:

```typescript
const controllers = [
  resolve(USER_TYPES.Controllers.CreateUser),
  resolve(USER_TYPES.Controllers.UserProfile),
  resolve(USER_TYPES.Controllers.UpdateUserProfile),
  resolve(USER_TYPES.Controllers.MyProfile),
  resolve(USER_TYPES.Controllers.UserMetrics),
  resolve(AUTH_TYPES.Controllers.RefreshToken),
  resolve(USER_TYPES.Controllers.ChangePassword),
  resolve(USER_TYPES.Controllers.CreatePasswordReauthGrant),
  resolve(USER_TYPES.Controllers.DefinePassword),
  resolve(USER_TYPES.Controllers.ForgotPassword),
  resolve(USER_TYPES.Controllers.ResetPassword),
  resolve(USER_TYPES.Controllers.FetchUsers),
  resolve(USER_TYPES.Controllers.ActivateUser),
  resolve(USER_TYPES.Controllers.SuspendUser),
  resolve(USER_TYPES.Controllers.PromoteToAdmin),
  resolve(USER_TYPES.Controllers.DemoteFromAdmin),
]
```

- [ ] **Step 7: Verificar TypeScript e testes**

```bash
pnpm --filter backend tsc:check
pnpm --filter backend test:run
```

Esperado: zero erros TypeScript, todos os testes passam.

- [ ] **Step 8: Commit**

```bash
cd apps/backend
git add \
  src/user/infra/controller/routes/user-routes.ts \
  src/shared/infra/ioc/module/service-identifier/user-types.ts \
  src/user/infra/controller/promote-to-admin.controller.ts \
  src/user/infra/controller/demote-from-admin.controller.ts \
  src/shared/infra/ioc/module/user/user-module.ts \
  src/bootstrap/setup-user-module.ts
git commit -m "feat(user): add promote/demote admin routes, controllers and IoC bindings"
```

## Critérios de Sucesso

- Rotas `PATCH /users/promote-admin` e `PATCH /users/demote-admin` existem [RF-001, RF-008]
- Ambas protegidas por `isProtected: true` e `onlyAdmin: true` [RF-007, RF-013]
- `DemoteFromAdminController` extrai `requesterId` de `req.user.sub.id`
- `tsc:check` passa sem erros
- `test:run` passa sem regressões
