# Task 7: Business flow tests (HTTP integration) [RF-001, RF-002, RF-006, RF-007, RF-008, RF-009, RF-010, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Testes HTTP de ponta a ponta usando `supertest` contra o servidor Fastify em memória, com repositórios e stores in-memory. Cobrem o fluxo completo: solicitar reset → usar token → logar com nova senha, além de casos de erro (token inválido, reutilização de token).

## Arquivos

- Create: `apps/backend/src/user/infra/controller/forgot-password.business-flow-test.ts`
- Create: `apps/backend/src/user/infra/controller/reset-password.business-flow-test.ts`

### Conformidade com as Skills Padrão

- test-antipatterns: use `container.rebind()` para substituir repositórios — não mocke o servidor Fastify

## Passos

- [ ] **Step 1: Criar `forgot-password.business-flow-test.ts`**

Crie `apps/backend/src/user/infra/controller/forgot-password.business-flow-test.ts`:

```ts
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "./routes/user-routes"

describe("POST /password/forgot", () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let tokenStore: InMemoryPasswordResetTokenStore

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    tokenStore = new InMemoryPasswordResetTokenStore()
    container
      .rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
      .toConstantValue(tokenStore)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("retorna 200 com mensagem genérica para email válido", async () => {
    await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })

    const response = await request(fastifyServer.server)
      .post(UserRoutes.FORGOT_PASSWORD)
      .send({ email: "user@test.com" })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body.message).toMatch(/cadastrado/i)
  })

  test("retorna 200 com mensagem genérica para email inexistente (sem enumeração)", async () => {
    const response = await request(fastifyServer.server)
      .post(UserRoutes.FORGOT_PASSWORD)
      .send({ email: "nao-existe@test.com" })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body.message).toBeDefined()
  })

  test("gera token no store após requisição com email válido", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })

    await request(fastifyServer.server)
      .post(UserRoutes.FORGOT_PASSWORD)
      .send({ email: "user@test.com" })

    const tokenHash = await tokenStore.findTokenHashByUserId(user.id)
    expect(tokenHash).not.toBeNull()
  })

  test("retorna 400 para email inválido (sem formato de email)", async () => {
    const response = await request(fastifyServer.server)
      .post(UserRoutes.FORGOT_PASSWORD)
      .send({ email: "nao-e-um-email" })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })
})
```

- [ ] **Step 2: Executar testes de forgot-password**

```bash
cd apps/backend
pnpm test:business-flow -- --reporter=verbose src/user/infra/controller/forgot-password.business-flow-test.ts
```

Esperado: 4 testes passam.

- [ ] **Step 3: Criar `reset-password.business-flow-test.ts`**

Crie `apps/backend/src/user/infra/controller/reset-password.business-flow-test.ts`:

```ts
import request from "supertest"
import { randomBytes, createHash } from "node:crypto"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { SessionRoutes } from "@/session/infra/controller/routes/session-routes"
import { UserRoutes } from "./routes/user-routes"

const PASSWORD_RESET_TTL = 900

function makeToken() {
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  return { rawToken, tokenHash }
}

describe("POST /password/reset", () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let tokenStore: InMemoryPasswordResetTokenStore

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    container.rebind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
    tokenStore = new InMemoryPasswordResetTokenStore()
    container
      .rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
      .toConstantValue(tokenStore)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test("fluxo completo: reset → login com nova senha funciona", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeToken()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    const resetResponse = await request(fastifyServer.server)
      .post(UserRoutes.RESET_PASSWORD)
      .send({ token: rawToken, newPassword: "NewPass456!" })

    expect(resetResponse.status).toBe(HTTP_STATUS.NO_CONTENT)

    const loginResponse = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({ email: user.email, password: "NewPass456!" })

    expect(loginResponse.status).toBe(HTTP_STATUS.OK)
    expect(loginResponse.body.token).toBeDefined()
  })

  test("token inválido → retorna 400", async () => {
    const response = await request(fastifyServer.server)
      .post(UserRoutes.RESET_PASSWORD)
      .send({ token: "token-invalido", newPassword: "NewPass456!" })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  test("token de uso único → segundo uso retorna 400", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeToken()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    await request(fastifyServer.server)
      .post(UserRoutes.RESET_PASSWORD)
      .send({ token: rawToken, newPassword: "NewPass456!" })

    const secondResponse = await request(fastifyServer.server)
      .post(UserRoutes.RESET_PASSWORD)
      .send({ token: rawToken, newPassword: "AnotherPass789!" })

    expect(secondResponse.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  test("login com senha antiga falha após reset", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeToken()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    await request(fastifyServer.server)
      .post(UserRoutes.RESET_PASSWORD)
      .send({ token: rawToken, newPassword: "NewPass456!" })

    const loginResponse = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({ email: user.email, password: "OldPass123!" })

    expect(loginResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
```

- [ ] **Step 4: Executar testes de reset-password**

```bash
cd apps/backend
pnpm test:business-flow -- --reporter=verbose src/user/infra/controller/reset-password.business-flow-test.ts
```

Esperado: 4 testes passam.

- [ ] **Step 5: Executar todos os testes unitários para confirmar que nada foi quebrado**

```bash
cd apps/backend
pnpm test:run
```

Esperado: todos os testes passam (sem regressões).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/infra/controller/forgot-password.business-flow-test.ts \
        apps/backend/src/user/infra/controller/reset-password.business-flow-test.ts
git commit -m "test(user): add business flow tests for forgot/reset password

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-001/RF-002: `POST /password/forgot` retorna 200 para email válido e inexistente
- RF-006/RF-007: body inválido retorna 400
- RF-008/RF-009: `POST /password/reset` com token inválido retorna 400
- RF-010: segundo uso do mesmo token retorna 400
- RF-012/RF-013: após reset, login com nova senha funciona; login com senha antiga falha
- Todos os testes unitários passam (sem regressões)
