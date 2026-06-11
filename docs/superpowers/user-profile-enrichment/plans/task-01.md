# Task 1: Enriquecer `UserProfileUseCase` e `MyProfileController` [RF-001, RF-002, RF-005]

**Status:** DONE
**PRD:** `../prd/prd-user-profile-enrichment.md`
**Spec:** `../specs/user-profile-enrichment-design.md`

## Visão Geral

Adicionar `createdAt` e `status` ao output do `UserProfileUseCase` e ao schema Zod do `MyProfileController`. Os dados já existem na entidade `User` — basta expô-los. Atualizar o teste existente para cobrir os novos campos.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/user-profile.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/my-profile.controller.ts`
- Modify: `apps/backend/src/user/application/use-case/user-profile.usecase.test.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever o teste antes de modificar o Use Case
- no-workarounds: expor dados já existentes na entidade — sem duplicação

## Passos

- [ ] **Step 1: Atualizar o teste para incluir os novos campos**

Abra `apps/backend/src/user/application/use-case/user-profile.usecase.test.ts` e substitua o test de sucesso principal para incluir `createdAt` e `status`:

```typescript
test("Deve expor hasPassword e authMethods no perfil do usuário", async () => {
  const user = await createAndSaveUser({
    userRepository,
    email: "john@doe.com",
    password: "Senha123!",
  })

  const result = await sut.execute({ userId: user.id })

  expect(result.isSuccess()).toBe(true)
  expect(result.forceSuccess().value).toMatchObject({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    hasPassword: true,
    authMethods: ["password"],
    status: "activated",
    createdAt: expect.any(String),
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd apps/backend
pnpm test:run -- -t "Deve expor hasPassword e authMethods"
```

Esperado: `FAIL` — `status` e `createdAt` não estão no resultado ainda.

- [ ] **Step 3: Atualizar o DTO de saída do `UserProfileUseCase`**

Em `apps/backend/src/user/application/use-case/user-profile.usecase.ts`, altere a interface `UserProfileUseCaseOutputDTO` e o `return success(...)`:

```typescript
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { User } from "@/user/domain/user"
import type { StatusTypes } from "@/user/domain/value-object/status"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UserProfileUseCaseInput {
  userId: string
}

interface UserProfileUseCaseOutputDTO {
  id: string | null
  name: string
  email: string
  role: string
  hasPassword: boolean
  authMethods: string[]
  createdAt: string
  status: StatusTypes
}

export type UserProfileUseCaseOutput = Either<
  Error,
  UserProfileUseCaseOutputDTO
>

@injectable()
export class UserProfileUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  private resolveAuthMethods(user: User): string[] {
    const methods: string[] = []
    if (user.password) methods.push("password")
    if (user.googleId) methods.push("google")
    return methods
  }

  public async execute(
    input: UserProfileUseCaseInput,
  ): Promise<UserProfileUseCaseOutput> {
    const userOrNull = await this.userRepository.userOfId(input.userId)
    if (!userOrNull) return failure(new UserNotFoundError())
    return success({
      email: userOrNull.email,
      id: userOrNull.id,
      name: userOrNull.name,
      role: userOrNull.role,
      hasPassword: Boolean(userOrNull.password),
      authMethods: this.resolveAuthMethods(userOrNull),
      createdAt: userOrNull.createdAt.toISOString(),
      status: userOrNull.status,
    })
  }
}
```

- [ ] **Step 4: Rodar o teste novamente para confirmar que passa**

```bash
cd apps/backend
pnpm test:run -- -t "Deve expor hasPassword e authMethods"
```

Esperado: `PASS`

- [ ] **Step 5: Atualizar o schema Zod do `MyProfileController`**

Em `apps/backend/src/user/infra/controller/my-profile.controller.ts`, adicione os novos campos ao schema de response:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { UserProfileUseCase } from "@/user/application/use-case/user-profile.usecase"
import { UserRoutes } from "./routes/user-routes"

export class MyProfileController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(USER_TYPES.UseCases.UserProfile)
    private readonly userProfile: UserProfileUseCase,
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
  public async init(): Promise<void> {
    this.server.register(
      "get",
      UserRoutes.ME,
      {
        callback: this.callback,
        isProtected: true,
      },
      makeMyProfileSwaggerSchema(),
    )
  }

  private async callback(req: FastifyRequest) {
    const user = req.user
    const result = await this.userProfile.execute({ userId: user.sub.id })
    if (result.isFailure()) {
      return this.createResponseError(result)
    }

    return ResponseFactory.create({
      status: 200,
      body: result.value,
    })
  }
}

const myProfileResponseSchema = z.object({
  id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
  name: z.string().meta({ description: "User name", example: "John Doe" }),
  email: z
    .string()
    .meta({ description: "User email", example: "john@example.com" }),
  role: z.string().meta({ description: "User role", example: "MEMBER" }),
  hasPassword: z.boolean().meta({
    description: "Whether the account has a local password",
    example: false,
  }),
  authMethods: z.array(z.string()).meta({
    description: "Enabled authentication methods",
    example: ["google"],
  }),
  createdAt: z.string().meta({
    description: "Account creation date (ISO 8601)",
    example: "2024-01-15T10:30:00.000Z",
  }),
  status: z.enum(["activated", "suspended"]).meta({
    description: "Account status",
    example: "activated",
  }),
})

const errorResponseSchema = z.object({
  message: z.string().meta({ description: "Error message" }),
})

function makeMyProfileSwaggerSchema(): Schema {
  return OpenApiSchemaBuilder.build({
    tags: ["users"],
    summary: "Get authenticated user profile",
    description: "Get the profile of the currently authenticated user.",
    security: true,
    responses: {
      200: {
        description: "Successful response",
        schema: myProfileResponseSchema,
      },
      401: { description: "Unauthorized" },
      404: { description: "User not found", schema: errorResponseSchema },
    },
  })
}
```

- [ ] **Step 6: Rodar todos os testes do backend para garantir que nada quebrou**

```bash
cd apps/backend
pnpm test:run
```

Esperado: todos passando.

- [ ] **Step 7: Verificar type-check e lint**

```bash
cd apps/backend
pnpm tsc:check && pnpm biome:fix
```

Esperado: zero erros.

- [ ] **Step 8: Commit**

```bash
cd apps/backend
git add apps/backend/src/user/application/use-case/user-profile.usecase.ts \
        apps/backend/src/user/infra/controller/my-profile.controller.ts \
        apps/backend/src/user/application/use-case/user-profile.usecase.test.ts
git commit -m "feat(user): expose createdAt and status in GET /users/me

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `UserProfileUseCase` retorna `createdAt` (string ISO 8601) e `status` (`"activated"` | `"suspended"`)
- Schema Zod do `MyProfileController` inclui os novos campos
- Todos os testes existentes continuam passando
- `tsc:check` e `biome:fix` sem erros [RF-001, RF-002, RF-005]
