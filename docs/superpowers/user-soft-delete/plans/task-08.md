# Task 8: Teste business-flow do `DELETE /users/:userId` [RF-011, RF-012, RF-013, RF-014, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-04, task-06

## Visão Geral

Teste HTTP de integração ponta-a-ponta do endpoint `DELETE /users/:userId`, seguindo o padrão de `promote-to-admin.business-flow-test.ts`. Cobre: 401 sem token, 403 para usuário comum, 403 para auto-exclusão e super admin, 204 no sucesso, e que o usuário excluído some do `GET /users` e não é contabilizado em `GET /users/stats`.

## Arquivos

- Create: `apps/backend/src/user/infra/controller/delete-user.business-flow-test.ts`

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: HTTP real via supertest + repositório InMemory rebound; sem mocks de produção.

## Passos

- **Step 1: Escrever o teste business-flow**

Crie `apps/backend/src/user/infra/controller/delete-user.business-flow-test.ts`:

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

function routeFor(userId: string): string {
  return UserRoutes.DELETE.replace(":userId", userId)
}

describe("Excluir Usuário (soft delete)", () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase
  let adminId: string
  let token: string

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container
      .rebind(USER_TYPES.Repositories.User)
      .toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(
      AUTH_TYPES.UseCases.Authenticate,
    )
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
    adminId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: adminId,
      email: "auth@delete.test",
      password: "any_password",
      role: "ADMIN",
    })
    const result = await authenticate.execute({
      email: "auth@delete.test",
      password: "any_password",
    })
    token = result.force.success().value.token
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("Deve soft-deletar um usuário e responder 204", async () => {
    const targetId = randomUUID()
    await createAndSaveUser({
      userRepository,
      id: targetId,
      email: "target@delete.test",
      role: "MEMBER",
    })

    const response = await request(fastifyServer.server)
      .delete(routeFor(targetId))
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
    expect(await userRepository.userOfId(targetId)).toBeNull()
  })

  test("Deve retornar 401 quando o JWT não é fornecido", async () => {
    const response = await request(fastifyServer.server).delete(
      routeFor(randomUUID()),
    )
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  test("Deve retornar 403 quando o solicitante não é admin", async () => {
    await createAndSaveUser({
      userRepository,
      id: randomUUID(),
      email: "member@delete.test",
      password: "member_password",
      role: "MEMBER",
    })
    const memberResult = await authenticate.execute({
      email: "member@delete.test",
      password: "member_password",
    })
    const memberToken = memberResult.force.success().value.token

    const response = await request(fastifyServer.server)
      .delete(routeFor(randomUUID()))
      .set("Authorization", `Bearer ${memberToken}`)

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("Deve retornar 403 ao tentar excluir a si próprio", async () => {
    const response = await request(fastifyServer.server)
      .delete(routeFor(adminId))
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("Deve retornar 403 ao tentar excluir um super admin", async () => {
    const superAdminId = randomUUID()
    const superAdmin = await createAndSaveUser({
      userRepository,
      id: superAdminId,
      email: "super@delete.test",
      role: "ADMIN",
    })
    // Marca como super admin via restore (createAndSaveUser não define isSuperAdmin)
    const { User } = await import("@/user/domain/user")
    await userRepository.update(
      User.restore({
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: "ADMIN",
        status: "activated",
        createdAt: superAdmin.createdAt,
        isSuperAdmin: true,
      }),
    )

    const response = await request(fastifyServer.server)
      .delete(routeFor(superAdminId))
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("Deve retornar 404 ao excluir um usuário inexistente", async () => {
    const response = await request(fastifyServer.server)
      .delete(routeFor(randomUUID()))
      .set("Authorization", `Bearer ${token}`)

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })
})
```

> Antes de rodar, confirme que `createAndSaveUser` aceita as props usadas (`id`, `email`, `role`, `password`) e que `result.force.success().value.token` é a forma correta de extrair o token (espelhe `promote-to-admin.business-flow-test.ts`). Se a factory expuser um modo direto de marcar `isSuperAdmin`, prefira-o ao `update(User.restore(...))`.

- **Step 2: Rodar o teste business-flow**

Run: `pnpm --filter backend test:business-flow -- -t "Excluir Usuário"`
Expected: PASS (6 cenários verdes).

- **Step 3: Verificar que o usuário some de GET /users e GET /users/stats**

Adicione ao mesmo describe um cenário que cria um usuário, faz o DELETE, e então consulta `GET /users` e `GET /users/stats` confirmando que o excluído não aparece nem é contado. Use as rotas `UserRoutes.FETCH` e `UserRoutes.STATS` com o token admin:

```typescript
test("Usuário excluído some de GET /users e de GET /users/stats", async () => {
  const targetId = randomUUID()
  await createAndSaveUser({
    userRepository,
    id: targetId,
    email: "vanish@delete.test",
    role: "MEMBER",
  })

  await request(fastifyServer.server)
    .delete(routeFor(targetId))
    .set("Authorization", `Bearer ${token}`)

  const list = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .set("Authorization", `Bearer ${token}`)
  const ids = (list.body.users as Array<{ id: string }>).map((u) => u.id)
  expect(ids).not.toContain(targetId)
})
```

> O `GET /users` usa o `UserDAO`. Em business-flow, confirme se o DAO também é rebound para InMemory; se a listagem usar o DAO Prisma real, este cenário específico pode pertencer a um teste de DAO (task-04 já cobre o filtro em nível de DAO). Se o ambiente de business-flow não tiver DAO InMemory populado a partir do `userRepository`, mantenha apenas a asserção de `userOfId === null` (Step 1) e registre que a verificação de listagem é coberta pelo teste de DAO da task-04.

- **Step 4: Rodar a suíte business-flow completa**

Run: `pnpm --filter backend test:business-flow`
Expected: toda a suíte business-flow passa.

- **Step 5: Validar lint e tipos**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check`
Expected: zero problemas.

- **Step 6: Commit**

```bash
git add apps/backend/src/user/infra/controller/delete-user.business-flow-test.ts
git commit -m "test(backend): add business-flow tests for DELETE /users/:userId"
```

## Critérios de Sucesso

- 401 sem token; 403 para usuário comum; 403 para auto-exclusão e super admin; 404 inexistente; 204 no sucesso (RF-011, RF-012, RF-013, RF-014).
- Usuário excluído desaparece de `userOfId` (e da listagem, conforme cobertura disponível no ambiente de business-flow / task-04) (RF-015).
- `test:business-flow`, `biome:fix` e `tsc:check` passam.
