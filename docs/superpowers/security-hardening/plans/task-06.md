# Task 6: Adicionar `onlyAdmin: true` ao FetchUsersController

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → HIGH-4

## Visão Geral

`GET /users` está protegido (`isProtected: true`) mas qualquer MEMBER autenticado pode obter a lista completa de usuários com emails, roles e status. A correção adiciona `onlyAdmin: true` ao registro da rota. Os testes existentes usam um usuário MEMBER — eles precisam ser atualizados para usar um ADMIN, e um novo teste deve verificar que MEMBER recebe 403.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/fetch-users.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: usar o mecanismo nativo `onlyAdmin: true` do framework, não um check manual no handler.
- `test-antipatterns`: atualizar testes existentes para refletir o novo comportamento esperado.
</skills>

## Passos

- [ ] **Step 1: Escrever teste que verifica que MEMBER recebe 403**

Em `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`, adicionar antes do `afterEach`:

```ts
test("Não deve permitir que MEMBER liste usuários", async () => {
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ limit: 10, page: 1 })
    .set("Authorization", `Bearer ${token}`) // token de MEMBER

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
})
```

> Nota: o `token` já existente no `beforeEach` pertence a um MEMBER — reuso intencional.

- [ ] **Step 2: Executar o teste para verificar que falha (atualmente retorna 200)**

Run:
```bash
pnpm --filter backend test:run -- -t "Não deve permitir que MEMBER liste usuários" 2>&1 | tail -15
```
Expected: FAIL — atualmente retorna 200 em vez de 403.

- [ ] **Step 3: Adicionar `onlyAdmin: true` ao registro da rota**

Em `apps/backend/src/user/infra/controller/fetch-users.controller.ts`, atualizar o `init()`:

```ts
// ANTES
public async init(): Promise<void> {
  this.httpServer.register(
    "get",
    UserRoutes.FETCH,
    {
      callback: this.callback,
      isProtected: true,
    },
    makeFetchUsersSwaggerSchema(),
  )
}

// DEPOIS
public async init(): Promise<void> {
  this.httpServer.register(
    "get",
    UserRoutes.FETCH,
    {
      callback: this.callback,
      isProtected: true,
      onlyAdmin: true,
    },
    makeFetchUsersSwaggerSchema(),
  )
}
```

- [ ] **Step 4: Atualizar o `beforeEach` para criar e autenticar um ADMIN**

Os testes existentes que esperam `200` precisam usar um ADMIN. Em `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`, atualizar o `beforeEach`:

```ts
beforeEach(async () => {
  container.snapshot()
  const userDAOMemory = new UserDAOMemory()
  container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
  userDAO = container.get(USER_TYPES.DAO.User)
  userRepository = new InMemoryUserRepository()
  container
    .rebind(USER_TYPES.Repositories.User)
    .toConstantValue(userRepository)
  authenticate = container.get<AuthenticateUseCase>(
    AUTH_TYPES.UseCases.Authenticate,
  )
  fastifyServer = await serverBuildForTest()
  await fastifyServer.ready()
  await createAndSaveUser({
    userRepository,
    email: "auth@user.com",
    password: "any_password",
    role: "ADMIN",   // ← ALTERADO: MEMBER → ADMIN
  })
  const result = await authenticate.execute({
    email: "auth@user.com",
    password: "any_password",
  })
  token = result.force.success().value.token
})
```

> Também adicionar ao describe um token separado para o teste de MEMBER:

```ts
let memberToken: string
```

E no `beforeEach`, criar um MEMBER separado para o teste de 403:

```ts
await createAndSaveUser({
  userRepository,
  email: "member@user.com",
  password: "any_password",
  role: "MEMBER",
})
const memberResult = await authenticate.execute({
  email: "member@user.com",
  password: "any_password",
})
memberToken = memberResult.force.success().value.token
```

Atualizar o teste de MEMBER para usar `memberToken`:

```ts
test("Não deve permitir que MEMBER liste usuários", async () => {
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ limit: 10, page: 1 })
    .set("Authorization", `Bearer ${memberToken}`) // ← token do MEMBER

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
})
```

- [ ] **Step 5: Executar todos os testes de fetch-users**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose src/user/infra/controller/fetch-users 2>&1 | tail -25
```
Expected: todos os testes passam.

- [ ] **Step 6: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend
git add src/user/infra/controller/fetch-users.controller.ts \
        src/user/infra/controller/fetch-users.business-flow-test.ts
git commit -m "fix(security): restrict GET /users to ADMIN only

Adds onlyAdmin: true to FetchUsersController route registration.
MEMBER requests now receive 403 Forbidden. Updates existing tests
to authenticate as ADMIN and adds a test for MEMBER rejection.

HIGH-4 from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `onlyAdmin: true` presente no registro da rota `GET /users`
- MEMBER recebe `403` ao chamar `GET /users`
- ADMIN continua recebendo `200` com a lista de usuários
- Todos os testes passam
- `tsc:check` sem erros
