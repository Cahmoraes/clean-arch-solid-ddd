# Task 5: Backend — Business Flow Tests [RF-001, RF-007, RF-008, RF-013]

**Status:** PENDING
**PRD:** `../prd/prd-admin-role-management.md`
**Spec:** `../specs/admin-role-management-design.md`

## Visão Geral

Cria os testes de fluxo HTTP (business flow) para as duas novas rotas, cobrindo os casos de sucesso, autenticação, autorização e erros de domínio. Segue o padrão exato de `suspend-user.business-flow-test.ts`.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts`
- Create: `apps/backend/src/user/infra/controller/demote-from-admin.business-flow-test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: sem mocks desnecessários — usar repositório in-memory real

## Passos

- [ ] **Step 1: Criar `promote-to-admin.business-flow-test.ts`**

Crie `apps/backend/src/user/infra/controller/promote-to-admin.business-flow-test.ts`:

```typescript
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Promover Usuário a Admin", () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase
  let token: string

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(AUTH_TYPES.UseCases.Authenticate)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "auth@promote.test",
      password: "any_password",
      role: "ADMIN",
    })
    const result = await authenticate.execute({
      email: "auth@promote.test",
      password: "any_password",
    })
    token = result.force.success().value.token
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("Deve promover membro ativo e responder 200", async () => {
    const targetId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: targetId,
      email: "target@promote.test",
      role: "MEMBER",
    })

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: targetId })

    expect(response.status).toBe(HTTP_STATUS.OK)
    const updated = await userRepository.userOfId(targetId)
    expect(updated?.role).toBe("ADMIN")
  })

  test("Deve retornar 401 quando o JWT não é fornecido", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  test("Deve retornar 403 quando o solicitante não é admin", async () => {
    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "member@promote.test",
      password: "member_password",
      role: "MEMBER",
    })
    const memberResult = await authenticate.execute({
      email: "member@promote.test",
      password: "member_password",
    })
    const memberToken = memberResult.force.success().value.token

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("Deve retornar 400 quando o body é inválido (userId não-UUID)", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: "not-a-uuid" })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 quando o usuário alvo não existe", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 ao tentar promover usuário suspenso", async () => {
    const targetId = randomUUID()
    const target = await createAndSaveUser({
      userRepository,
      id: targetId,
      email: "suspended@promote.test",
      role: "MEMBER",
    })
    target.suspend()
    await userRepository.update(target)

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: targetId })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 ao tentar promover admin@admin.com", async () => {
    const superAdminId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: superAdminId,
      email: "admin@admin.com",
      role: "MEMBER",
    })

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.PROMOTE_TO_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: superAdminId })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })
})
```

- [ ] **Step 2: Criar `demote-from-admin.business-flow-test.ts`**

Crie `apps/backend/src/user/infra/controller/demote-from-admin.business-flow-test.ts`:

```typescript
import { randomUUID } from "node:crypto"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("Demover Administrador", () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase
  let token: string

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(AUTH_TYPES.UseCases.Authenticate)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "auth@demote.test",
      password: "any_password",
      role: "ADMIN",
    })
    const result = await authenticate.execute({
      email: "auth@demote.test",
      password: "any_password",
    })
    token = result.force.success().value.token
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("Deve demover admin e responder 200", async () => {
    const targetId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: targetId,
      email: "target@demote.test",
      role: "ADMIN",
    })

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: targetId })

    expect(response.status).toBe(HTTP_STATUS.OK)
    const updated = await userRepository.userOfId(targetId)
    expect(updated?.role).toBe("MEMBER")
  })

  test("Deve retornar 401 quando o JWT não é fornecido", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  test("Deve retornar 403 quando o solicitante não é admin", async () => {
    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "member@demote.test",
      password: "member_password",
      role: "MEMBER",
    })
    const memberResult = await authenticate.execute({
      email: "member@demote.test",
      password: "member_password",
    })
    const memberToken = memberResult.force.success().value.token

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("Deve retornar 400 quando o body é inválido (userId não-UUID)", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: "not-a-uuid" })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 quando o usuário alvo não existe", async () => {
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: randomUUID() })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 ao tentar demover admin@admin.com", async () => {
    const superAdminId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: superAdminId,
      email: "admin@admin.com",
      role: "ADMIN",
    })

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: superAdminId })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })

  test("Deve retornar 422 ao tentar demover usuário que não é admin", async () => {
    const targetId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: targetId,
      email: "member-target@demote.test",
      role: "MEMBER",
    })

    const response = await request(fastifyServer.server)
      .patch(UserRoutes.DEMOTE_FROM_ADMIN)
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: targetId })

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(response.body).toHaveProperty("message")
  })
})
```

- [ ] **Step 3: Rodar os business flow tests**

```bash
pnpm --filter backend test:business-flow
```

Esperado: todos os testes passam (13 testes novos).

- [ ] **Step 4: Rodar testes unitários para garantir zero regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
cd apps/backend
git add \
  src/user/infra/controller/promote-to-admin.business-flow-test.ts \
  src/user/infra/controller/demote-from-admin.business-flow-test.ts
git commit -m "test(user): add promote/demote admin business flow tests"
```

## Critérios de Sucesso

- `PATCH /users/promote-admin` com admin autenticado → 200, role atualizada [RF-001, RF-007]
- `PATCH /users/demote-admin` com admin autenticado → 200, role atualizada [RF-008, RF-013]
- Ambas as rotas: 401 sem JWT, 403 com MEMBER, 400 body inválido, 422 erros de domínio
- `test:business-flow` e `test:run` passam
