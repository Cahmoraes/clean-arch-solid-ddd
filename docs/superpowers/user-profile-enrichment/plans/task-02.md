# Task 2: Criar `UpdateMyProfileUseCase` e `UpdateMyProfileController` [RF-009, RF-010]

**Status:** DONE
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Criar o endpoint `PATCH /users/me` que permite ao usuário autenticado atualizar somente o nome. O `UpdateMyProfileUseCase` extrai o `userId` do token JWT (via controller), atualiza apenas o nome (email permanece inalterado), e segue o Either pattern. Registrar no IoC e bootstrap.

## Arquivos

- Create: `apps/backend/src/user/application/use-case/update-my-profile.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/update-my-profile.usecase.test.ts`
- Create: `apps/backend/src/user/infra/controller/update-my-profile.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-user-module.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever o teste antes do Use Case
- no-workarounds: reutilizar `user.updateProfile()` da entidade e `userRepository.update()`

## Passos

- [ ] **Step 1: Escrever o arquivo de teste**

Crie `apps/backend/src/user/application/use-case/update-my-profile.usecase.test.ts`:

```typescript
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"
import {
  UpdateMyProfileUseCase,
  type UpdateMyProfileUseCaseInput,
} from "./update-my-profile.usecase"

describe("UpdateMyProfileUseCase", () => {
  let sut: UpdateMyProfileUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    userRepository = (await setupInMemoryRepositories()).userRepository
    sut = container.get(UpdateMyProfileUseCase, { autobind: true })
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve atualizar o nome do usuário autenticado", async () => {
    const user = await createAndSaveUser({
      userRepository,
      name: "João Silva",
      email: "joao@example.com",
      password: "Senha123!",
    })

    const input: UpdateMyProfileUseCaseInput = {
      userId: user.id,
      name: "João Carlos Silva",
    }

    const result = await sut.execute(input)

    expect(result.isSuccess()).toBe(true)
    expect(result.forceSuccess().value).toEqual({ name: "João Carlos Silva" })
    const updated = await userRepository.userOfId(user.id)
    expect(updated?.name).toBe("João Carlos Silva")
    expect(updated?.email).toBe("joao@example.com")
  })

  test("Não deve atualizar o nome para um usuário inexistente", async () => {
    const input: UpdateMyProfileUseCaseInput = {
      userId: "non-existent-id",
      name: "Novo Nome",
    }

    const result = await sut.execute(input)

    expect(result.isFailure()).toBe(true)
    expect(result.force.failure().value).toBeInstanceOf(UserNotFoundError)
  })

  test("Não deve atualizar o nome para um valor inválido (muito curto)", async () => {
    const user = await createAndSaveUser({
      userRepository,
      name: "João Silva",
      email: "joao@example.com",
    })

    const input: UpdateMyProfileUseCaseInput = {
      userId: user.id,
      name: "A",
    }

    const result = await sut.execute(input)

    expect(result.isFailure()).toBe(true)
    const updated = await userRepository.userOfId(user.id)
    expect(updated?.name).toBe("João Silva")
  })

  test("Não deve alterar o e-mail do usuário ao atualizar o nome", async () => {
    const user = await createAndSaveUser({
      userRepository,
      name: "João Silva",
      email: "joao@example.com",
    })

    await sut.execute({ userId: user.id, name: "João Atualizado" })

    const updated = await userRepository.userOfId(user.id)
    expect(updated?.email).toBe("joao@example.com")
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend
pnpm test:run -- -t "UpdateMyProfileUseCase"
```

Esperado: `FAIL` — o módulo `update-my-profile.usecase` ainda não existe.

- [ ] **Step 3: Criar o `UpdateMyProfileUseCase`**

Crie `apps/backend/src/user/application/use-case/update-my-profile.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { UserValidationErrors } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UpdateMyProfileUseCaseInput {
  userId: string
  name: string
}

export interface UpdateMyProfileUseCaseOutputDTO {
  name: string
}

export type UpdateMyProfileUseCaseOutput = Either<
  UserNotFoundError | UserValidationErrors[],
  UpdateMyProfileUseCaseOutputDTO
>

@injectable()
export class UpdateMyProfileUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: UpdateMyProfileUseCaseInput,
  ): Promise<UpdateMyProfileUseCaseOutput> {
    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())

    const updateResult = user.updateProfile({
      name: input.name,
      email: user.email,
    })
    if (updateResult.isFailure()) {
      return failure(updateResult.value)
    }

    await this.userRepository.update(user)
    return success({ name: user.name })
  }
}
```

- [ ] **Step 4: Rodar os testes do use case para confirmar que passam**

```bash
cd apps/backend
pnpm test:run -- -t "UpdateMyProfileUseCase"
```

Esperado: todos os 4 testes passando.

- [ ] **Step 5: Adicionar símbolos IoC para o novo use case e controller**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`, adicione dentro de `UseCases` e `Controllers`:

```typescript
// Dentro de UseCases:
UpdateMyProfile: Symbol.for("UpdateMyProfileUseCase"),

// Dentro de Controllers:
UpdateMyProfile: Symbol.for("UpdateMyProfileController"),
```

O arquivo final fica:

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
    UpdateMyProfile: Symbol.for("UpdateMyProfileUseCase"),
    SuspendUser: Symbol.for("SuspendUserUseCase"),
    PromoteToAdmin: Symbol.for("PromoteToAdminUseCase"),
    DemoteFromAdmin: Symbol.for("DemoteFromAdminUseCase"),
    UserMetrics: Symbol.for("UserMetricsUseCase"),
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
    UpdateMyProfile: Symbol.for("UpdateMyProfileController"),
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

- [ ] **Step 6: Criar o `UpdateMyProfileController`**

Crie `apps/backend/src/user/infra/controller/update-my-profile.controller.ts`:

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
import type { UpdateMyProfileUseCase } from "@/user/application/use-case/update-my-profile.usecase"
import { UserRoutes } from "./routes/user-routes"

const updateMyProfileBodySchema = z.object({
  name: z
    .string()
    .min(2)
    .meta({ description: "User name", example: "John Doe" }),
})

export class UpdateMyProfileController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.UpdateMyProfile)
    private readonly updateMyProfile: UpdateMyProfileUseCase,
  ) {
    super()
    this.bindMethods()
  }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({
    message: "✅ | 🔒",
  })
  public async init() {
    this.httpServer.register(
      "patch",
      UserRoutes.ME,
      {
        callback: this.callback,
        isProtected: true,
      },
      makeUpdateMyProfileSwaggerSchema(),
    )
  }

  protected override mapResponseError(
    error: Error | Error[],
  ): HandleCallbackResponse | undefined {
    if (Array.isArray(error) || error instanceof ZodError) {
      return undefined
    }
    if (error.name.endsWith("NotFoundError")) {
      return ResponseFactory.create({
        status: 404,
        body: { message: error.message },
      })
    }
    return undefined
  }

  private async callback(req: FastifyRequest) {
    const parseBodyResult = this.parseRequest(
      updateMyProfileBodySchema,
      req.body,
    )
    if (parseBodyResult.isFailure()) {
      return this.createResponseError(parseBodyResult)
    }

    const result = await this.updateMyProfile.execute({
      userId: req.user.sub.id,
      name: parseBodyResult.value.name,
    })

    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.create({
      status: 200,
      body: result.value,
    })
  }
}

const updateMyProfileResponseSchema = z.object({
  name: z
    .string()
    .meta({ description: "Updated user name", example: "John Doe" }),
})

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makeUpdateMyProfileSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Update authenticated user name",
    description: "Update the name of the currently authenticated user.",
    security: true,
    body: updateMyProfileBodySchema,
    responses: {
      200: {
        description: "Name updated successfully",
        schema: updateMyProfileResponseSchema,
      },
      400: { description: "Bad Request", schema: errorResponseSchema },
      401: { description: "Unauthorized" },
      404: { description: "User not found", schema: errorResponseSchema },
      422: { description: "Unprocessable Entity", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 7: Registrar bindings no `user-module.ts`**

Em `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicione:

```typescript
// Imports a adicionar no topo:
import { UpdateMyProfileUseCase } from "@/user/application/use-case/update-my-profile.usecase"
import { UpdateMyProfileController } from "@/user/infra/controller/update-my-profile.controller"

// Bindings a adicionar dentro do ContainerModule (em qualquer posição):
bind(USER_TYPES.Controllers.UpdateMyProfile).to(UpdateMyProfileController)
bind(USER_TYPES.UseCases.UpdateMyProfile).to(UpdateMyProfileUseCase)
```

- [ ] **Step 8: Registrar o controller no bootstrap**

Em `apps/backend/src/bootstrap/setup-user-module.ts`, adicione o controller à lista `controllers`:

```typescript
// Adicionar na lista de controllers (em qualquer posição):
resolve(USER_TYPES.Controllers.UpdateMyProfile),
```

- [ ] **Step 9: Rodar todos os testes do backend**

```bash
cd apps/backend
pnpm test:run
```

Esperado: todos passando.

- [ ] **Step 10: Type-check e lint**

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/user/application/use-case/update-my-profile.usecase.ts \
        apps/backend/src/user/application/use-case/update-my-profile.usecase.test.ts \
        apps/backend/src/user/infra/controller/update-my-profile.controller.ts \
        apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts \
        apps/backend/src/bootstrap/setup-user-module.ts
git commit -m "feat(user): add PATCH /users/me endpoint to update authenticated user name

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `UpdateMyProfileUseCase` atualiza nome sem alterar e-mail [RF-009]
- `UpdateMyProfileController` registra `PATCH /users/me` protegido por JWT [RF-010]
- Retorna `404` se usuário não encontrado, `400` se nome inválido [RF-010]
- Todos os testes passando; `tsc:check` e `biome:fix` sem erros
