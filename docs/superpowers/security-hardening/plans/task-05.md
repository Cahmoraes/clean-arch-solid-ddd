# Task 5: Corrigir IDOR no UserProfileController

**Status:** DONE
**PRD:** N/A
**Spec:** N/A — ver `apps/backend/reports/security-review-2026-05-11.md` → HIGH-3

## Visão Geral

`GET /users/:userId` retorna o perfil de qualquer usuário sem verificar se o solicitante é o dono do recurso ou um admin. Qualquer usuário autenticado pode iterar UUIDs e obter `name`, `email` e `role` de todos os usuários. A correção adiciona um ownership check: apenas o próprio usuário ou um ADMIN pode acessar o endpoint.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/user-profile.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/user-profile.business-flow-test.ts`

<skills>
### Compliance with Standard Skills

- `no-workarounds`: verificação de ownership no controller, não em middleware genérico.
- `test-antipatterns`: testar comportamento HTTP real — 403 para MEMBER acessando outro usuário, 200 para ADMIN.
</skills>

## Passos

- [ ] **Step 1: Escrever o teste que verifica que MEMBER não pode acessar perfil de outro usuário**

Em `apps/backend/src/user/infra/controller/user-profile.business-flow-test.ts`, adicionar após o bloco `describe` existente ou dentro dele, após o último teste:

```ts
test("Não deve permitir que um usuário acesse o perfil de outro usuário", async () => {
  // Criar usuário A (owner do recurso)
  const userA = await createAndSaveUser({
    userRepository,
    id: "user-a-id",
    email: "usera@test.com",
    password: "any_password",
  })

  // Criar usuário B (quem tenta acessar)
  await createAndSaveUser({
    userRepository,
    id: "user-b-id",
    email: "userb@test.com",
    password: "any_password",
  })

  // Autenticar como usuário B
  const result = await authenticate.execute({
    email: "userb@test.com",
    password: "any_password",
  })
  const tokenB = result.force.success().value.token

  // Tentar acessar o perfil de A com token de B
  const response = await request(fastifyServer.server)
    .get(toPath(userA.id))
    .set("Authorization", `Bearer ${tokenB}`)
    .send()

  expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  expect(response.body).toHaveProperty("message")
})
```

- [ ] **Step 2: Escrever o teste que verifica que ADMIN pode acessar perfil de qualquer usuário**

Ainda no mesmo arquivo, adicionar:

```ts
test("Deve permitir que ADMIN acesse o perfil de qualquer usuário", async () => {
  // Criar usuário alvo (MEMBER)
  const targetUser = await createAndSaveUser({
    userRepository,
    id: "target-user-id",
    email: "target@test.com",
    password: "any_password",
  })

  // Criar admin
  await createAndSaveUser({
    userRepository,
    id: "admin-user-id",
    email: "admin@test.com",
    password: "any_password",
    role: "ADMIN",
  })

  // Autenticar como admin
  const result = await authenticate.execute({
    email: "admin@test.com",
    password: "any_password",
  })
  const adminToken = result.force.success().value.token

  // Admin acessa perfil do MEMBER
  const response = await request(fastifyServer.server)
    .get(toPath(targetUser.id))
    .set("Authorization", `Bearer ${adminToken}`)
    .send()

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.id).toBe(targetUser.id)
})
```

- [ ] **Step 3: Executar os novos testes para verificar que falham**

Run:
```bash
pnpm --filter backend test:run -- -t "Não deve permitir que um usuário acesse" 2>&1 | tail -15
```
Expected: FAIL — atualmente retorna 200 em vez de 403.

- [ ] **Step 4: Adicionar ownership check no `UserProfileController`**

Em `apps/backend/src/user/infra/controller/user-profile.controller.ts`, substituir o método `callback`:

```ts
private async callback(req: FastifyRequest) {
  const parseParamsResult = this.parseRequest(
    userProfileRequestSchema,
    req.params,
  )
  if (parseParamsResult.isFailure()) {
    return this.createResponseError(parseParamsResult)
  }

  const requesterId = req.user.sub.id
  const targetId = parseParamsResult.value.userId
  const isAdmin = req.user.sub.role === "ADMIN"

  if (requesterId !== targetId && !isAdmin) {
    return ResponseFactory.FORBIDDEN({ message: "Forbidden" })
  }

  const result = await this.userProfile.execute({
    userId: targetId,
  })
  if (result.isFailure()) {
    return this.createResponseError(result)
  }

  return ResponseFactory.create({
    status: 200,
    body: result.value,
  })
}
```

- [ ] **Step 5: Executar todos os testes de user-profile**

Run:
```bash
pnpm --filter backend test:run -- --reporter=verbose src/user/infra/controller/user-profile 2>&1 | tail -20
```
Expected: todos os testes passam, incluindo os dois novos.

- [ ] **Step 6: Verificar typecheck e lint**

Run:
```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix 2>&1 | tail -10
```
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend
git add src/user/infra/controller/user-profile.controller.ts \
        src/user/infra/controller/user-profile.business-flow-test.ts
git commit -m "fix(security): add ownership check to GET /users/:userId (IDOR)

Users can only access their own profile. ADMINs can access any
profile. Returns 403 Forbidden for unauthorized cross-user access.

HIGH-3 (BOLA/IDOR) from security-review-2026-05-11

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- MEMBER acessando `/users/:outroId` recebe `403 Forbidden`
- MEMBER acessando `/users/:seuPropioId` recebe `200 OK`
- ADMIN acessando `/users/:qualquerId` recebe `200 OK`
- Todos os testes passam
- `tsc:check` sem erros
