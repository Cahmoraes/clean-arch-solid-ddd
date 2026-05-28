# Task 7: `ForgotPasswordUseCase` — bloquear `suspended` silenciosamente [RF-012, RF-013]

**Status:** PENDING
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Modifica o `ForgotPasswordUseCase` para rejeitar silenciosamente (retornar `success(null)` sem gerar token e sem enviar e-mail) quando o usuário tem status `suspended`. Usuários com status `locked` continuam sendo processados normalmente. A resposta HTTP ao cliente permanece idêntica em todos os casos (anti-enumeração).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/forgot-password.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: retorno `success(null)` é intencional para não expor status da conta
- test-driven-development: testes antes da implementação

## Passos

- [ ] **Step 1: Adicionar testes para o comportamento de `suspended`**

Arquivo: `apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts`

Adicionar os seguintes testes ao `describe` existente:

```typescript
import { StatusTypes } from "@/user/domain/value-object/status"

test("Deve retornar sucesso silenciosamente para usuário suspended (sem gerar token)", async () => {
  const suspendedUser = User.restore({
    id: "suspended-id",
    name: "Suspended User",
    email: "suspended@test.com",
    role: "MEMBER",
    status: StatusTypes.SUSPENDED,
    createdAt: new Date(),
  })
  await userRepository.save(suspendedUser)

  const result = await sut.execute({ email: "suspended@test.com" })

  expect(result.isSuccess()).toBe(true)
  // Nenhum token gerado no Redis
  const tokenHash = await cacheDB.get("pwd-reset:uid:suspended-id")
  expect(tokenHash).toBeNull()
})

test("Deve processar normalmente usuário com status locked", async () => {
  const lockedUser = User.restore({
    id: "locked-id",
    name: "Locked User",
    email: "locked@test.com",
    role: "MEMBER",
    status: StatusTypes.LOCKED,
    createdAt: new Date(),
    password: "hashed-password-value",
  })
  await userRepository.save(lockedUser)

  const result = await sut.execute({ email: "locked@test.com" })

  expect(result.isSuccess()).toBe(true)
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:run -- -t "ForgotPassword"
```

Esperado: o teste de `suspended` pode PASSAR se o `ForgotPasswordUseCase` atual já não gera token por algum motivo, ou FALHAR se gera token para qualquer usuário encontrado. O teste de `locked` deve passar. Confirmar o comportamento atual antes de modificar.

- [ ] **Step 3: Modificar `ForgotPasswordUseCase` — adicionar verificação de `suspended`**

Arquivo: `apps/backend/src/user/application/use-case/forgot-password.usecase.ts`

Localizar o bloco após encontrar o usuário por email. O código atual deve ser algo como:

```typescript
const user = await this.userRepository.userOfEmail(input.email)
if (!user) {
  return success(null) // silently succeed — anti-enumeration
}
// ... continua com geração de token
```

Adicionar a verificação de `suspended` logo após a verificação de usuário não encontrado:

```typescript
const user = await this.userRepository.userOfEmail(input.email)
if (!user) {
  return success(null) // silently succeed — anti-enumeration
}

// Usuário suspenso pelo admin: retornar sucesso silencioso (não revelar status)
if (user.isSuspend) {
  return success(null)
}

// Continua o fluxo normal para activated e locked
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "ForgotPassword"
```

Esperado: PASS — todos os testes de forgot password passam, incluindo os novos.

- [ ] **Step 5: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/application/use-case/forgot-password.usecase.ts \
        apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts
git commit -m "feat(login-security-lockout): bloquear silenciosamente suspended no ForgotPasswordUseCase"
```

## Critérios de Sucesso

- Usuário `suspended` → `ForgotPasswordUseCase` retorna `success(null)` sem gerar token [RF-013]
- Nenhum token armazenado no Redis para usuário `suspended`
- Usuário `locked` → fluxo normal (token gerado, e-mail enviado) [RF-012]
- Resposta HTTP idêntica em todos os casos (anti-enumeração) [RF-013]
- `pnpm --filter backend test:run` passa sem regressões [RF-012, RF-013]
