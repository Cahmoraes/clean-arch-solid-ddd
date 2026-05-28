# Task 8: `ResetPasswordUseCase` — desbloquear `locked` + rejeitar `suspended` [RF-011, RF-012, RF-013]

**Status:** PENDING
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Modifica o `ResetPasswordUseCase` para: (1) rejeitar com `InvalidResetTokenError` se o usuário está `suspended` no momento do uso do token (edge case: admin suspendeu enquanto token estava ativo); (2) após troca de senha bem-sucedida de conta `locked`, chamar `user.activate()` e deletar a chave `login:locked:{userId}` do Redis.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/reset-password.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/reset-password.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: verificação de status no momento da execução (não confiar no estado do token)
- test-driven-development: testes antes da implementação

## Passos

- [ ] **Step 1: Adicionar testes para os novos comportamentos**

Arquivo: `apps/backend/src/user/application/use-case/reset-password.usecase.test.ts`

Adicionar os imports necessários:

```typescript
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"
import { StatusTypes } from "@/user/domain/value-object/status"
```

Adicionar os testes:

```typescript
test("Deve desbloquear conta locked após reset de senha bem-sucedido", async () => {
  // Criar usuário bloqueado
  const lockedUser = User.restore({
    id: "locked-user-id",
    name: "Locked User",
    email: "locked@test.com",
    role: "MEMBER",
    status: StatusTypes.LOCKED,
    createdAt: new Date(),
  })
  await userRepository.save(lockedUser)

  // Simular token válido no Redis (que seria gerado pelo lockout)
  const rawToken = "test-raw-token-abc123"
  const { createHash } = await import("node:crypto")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  await passwordResetTokenStore.saveResetToken("locked-user-id", tokenHash, 900)
  await passwordResetTokenStore.saveUidMapping("locked-user-id", tokenHash, 900)

  const loginAttemptStore = container.get<LoginAttemptStore>(USER_TYPES.Gateways.LoginAttemptStore)
  await loginAttemptStore.setLocked("locked-user-id")

  const result = await sut.execute({ token: rawToken, newPassword: "NewPass123!" })

  expect(result.isSuccess()).toBe(true)
  const user = await userRepository.userOfId("locked-user-id")
  expect(user?.isActive).toBe(true)
  expect(user?.isLocked).toBe(false)
  const stillLocked = await loginAttemptStore.isLocked("locked-user-id")
  expect(stillLocked).toBe(false)
})

test("Deve rejeitar reset de senha para usuário suspended (edge case)", async () => {
  // Token gerado quando estava locked, mas admin suspendeu antes do uso
  const suspendedUser = User.restore({
    id: "suspended-user-id",
    name: "Suspended User",
    email: "suspended@test.com",
    role: "MEMBER",
    status: StatusTypes.SUSPENDED,
    createdAt: new Date(),
  })
  await userRepository.save(suspendedUser)

  const rawToken = "test-suspended-token"
  const { createHash } = await import("node:crypto")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  await passwordResetTokenStore.saveResetToken("suspended-user-id", tokenHash, 900)
  await passwordResetTokenStore.saveUidMapping("suspended-user-id", tokenHash, 900)

  const result = await sut.execute({ token: rawToken, newPassword: "NewPass123!" })

  expect(result.isFailure()).toBe(true)
  expect(result.forceFailure().value).toBeInstanceOf(InvalidResetTokenError)
})
```

> **Nota:** `passwordResetTokenStore` e `userRepository` já são declarados no `describe` existente. Verificar as variáveis disponíveis no escopo de teste.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:run -- -t "ResetPassword"
```

Esperado: os novos testes FALHAM (lógica de unlock e rejeição suspended não implementada).

- [ ] **Step 3: Modificar `ResetPasswordUseCase` — injetar `LoginAttemptStore` e adicionar lógica**

Arquivo: `apps/backend/src/user/application/use-case/reset-password.usecase.ts`

**3a. Adicionar import e injection de `LoginAttemptStore`:**

```typescript
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"

// No construtor, adicionar:
@inject(USER_TYPES.Gateways.LoginAttemptStore)
private readonly loginAttemptStore: LoginAttemptStore,
```

**3b. Adicionar verificação de `suspended` após encontrar o usuário** (antes de trocar a senha):

```typescript
// Após encontrar o usuário via token:
const user = await this.userRepository.userOfId(userId)
if (!user) {
  return failure(new UserNotFoundError())
}

// Edge case: admin suspendeu a conta enquanto o token ainda estava ativo
if (user.isSuspend) {
  return failure(new InvalidResetTokenError())
}

// Continua com a troca de senha...
```

**3c. Após troca de senha bem-sucedida, desbloquear se estava locked:**

```typescript
// Após user.changePassword() e userRepository.update(user):
// Se o usuário estava locked, desbloquear
if (wasLocked) {
  user.activate()
  await this.loginAttemptStore.deleteLock(user.id)
}
await this.userRepository.update(user)
```

> **Implementação completa do método `execute`** (para referência, incorporar ao código existente):
>
> ```typescript
> public async execute(input: ResetPasswordUseCaseInput): Promise<ResetPasswordUseCaseOutput> {
>   const tokenHash = createHash("sha256").update(input.token).digest("hex")
>
>   const userId = await this.passwordResetTokenStore.findUserIdByTokenHash(tokenHash)
>   if (!userId) {
>     return failure(new InvalidResetTokenError())
>   }
>
>   const user = await this.userRepository.userOfId(userId)
>   if (!user) {
>     return failure(new UserNotFoundError())
>   }
>
>   // Edge case: admin suspendeu enquanto token estava ativo
>   if (user.isSuspend) {
>     return failure(new InvalidResetTokenError())
>   }
>
>   const wasLocked = user.isLocked
>
>   const changePasswordResult = await user.changePassword(input.newPassword)
>   if (changePasswordResult.isFailure()) {
>     return failure(changePasswordResult.value)
>   }
>
>   // Desbloquear conta se estava locked por segurança
>   if (wasLocked) {
>     user.activate()
>     await this.loginAttemptStore.deleteLock(user.id)
>   }
>
>   await this.userRepository.update(user)
>
>   // Invalidar tokens usados
>   await this.passwordResetTokenStore.deleteResetToken(tokenHash)
>   await this.passwordResetTokenStore.deleteUidMapping(userId)
>
>   // Revogar todas as sessões (comportamento existente)
>   await this.revokedTokenDAO.revokeAllForUser(userId, 7 * 24 * 60 * 60)
>
>   return success(null)
> }
> ```
>
> **Nota:** Preservar todos os imports e injeções existentes no arquivo. Apenas adicionar `LoginAttemptStore` e as verificações descritas.

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "ResetPassword"
```

Esperado: PASS — todos os testes passam.

- [ ] **Step 5: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/application/use-case/reset-password.usecase.ts \
        apps/backend/src/user/application/use-case/reset-password.usecase.test.ts
git commit -m "feat(login-security-lockout): desbloquear conta locked e rejeitar suspended no ResetPasswordUseCase"
```

## Critérios de Sucesso

- Reset bem-sucedido de conta `locked` → status `activated` + Redis lock limpo [RF-011]
- Token usado por conta `suspended` → `InvalidResetTokenError` [RF-012, RF-013]
- Sessões revogadas após reset (comportamento existente preservado) [RF-011]
- `pnpm --filter backend test:run` passa sem regressões [RF-011, RF-012, RF-013]
