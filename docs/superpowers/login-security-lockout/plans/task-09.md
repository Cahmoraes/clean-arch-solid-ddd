# Task 9: `ActiveUserUseCase` — limpar Redis lock ao ativar [RF-014, RF-015]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Modifica o `ActiveUserUseCase` para injetar `LoginAttemptStore` e, ao ativar um usuário, deletar a chave `login:locked:{userId}` do Redis. Isso garante que o cache Redis fique em sincronia com o DB quando um admin desbloqueia manualmente uma conta.

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/active-user.usecase.ts`
- Modify: `apps/backend/src/user/application/use-case/active-user.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: limpar cache é correto; não usar TTL workaround

## Passos

- [ ] **Step 1: Adicionar teste para verificar limpeza do Redis lock**

Arquivo: `apps/backend/src/user/application/use-case/active-user.usecase.test.ts`

Adicionar imports necessários:

```typescript
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"
import { StatusTypes } from "@/user/domain/value-object/status"
```

Adicionar os testes:

```typescript
test("Deve limpar o Redis lock ao ativar uma conta bloqueada por segurança", async () => {
  const loginAttemptStore = container.get<LoginAttemptStore>(USER_TYPES.Gateways.LoginAttemptStore)

  const lockedUser = User.restore({
    id: "locked-user-id",
    name: "Locked User",
    email: "locked@test.com",
    role: "MEMBER",
    status: StatusTypes.LOCKED,
    createdAt: new Date(),
  })
  await userRepository.save(lockedUser)
  await loginAttemptStore.setLocked("locked-user-id")

  expect(await loginAttemptStore.isLocked("locked-user-id")).toBe(true)

  const result = await sut.execute({ userId: "locked-user-id" })

  expect(result.isSuccess()).toBe(true)
  expect(await loginAttemptStore.isLocked("locked-user-id")).toBe(false)

  const user = await userRepository.userOfId("locked-user-id")
  expect(user?.isActive).toBe(true)
})

test("Não deve falhar ao ativar usuário que não tem lock no Redis (activated → activated)", async () => {
  const activeUser = User.restore({
    id: "active-user-id",
    name: "Active User",
    email: "active@test.com",
    role: "MEMBER",
    status: StatusTypes.ACTIVATED,
    createdAt: new Date(),
  })
  await userRepository.save(activeUser)

  const result = await sut.execute({ userId: "active-user-id" })

  expect(result.isSuccess()).toBe(true)
})
```

- [ ] **Step 2: Rodar os testes para confirmar que o novo teste falha**

```bash
pnpm --filter backend test:run -- -t "ActiveUser"
```

Esperado: o teste de "limpar Redis lock" FALHA (lógica não implementada).

- [ ] **Step 3: Modificar `ActiveUserUseCase`**

Arquivo: `apps/backend/src/user/application/use-case/active-user.usecase.ts`

**3a. Adicionar import:**

```typescript
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"
```

**3b. Adicionar injection no construtor:**

```typescript
@inject(USER_TYPES.Gateways.LoginAttemptStore)
private readonly loginAttemptStore: LoginAttemptStore,
```

**3c. Adicionar limpeza de Redis lock após `user.activate()` e `userRepository.update()`:**

```typescript
// Após this.userRepository.update(user):
// Limpar cache de lock (fire-and-forget, não crítico)
this.loginAttemptStore.deleteLock(user.id).catch((err) => {
  console.error("[ActiveUserUseCase] Falha ao limpar Redis lock:", err)
})
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "ActiveUser"
```

Esperado: PASS — todos os testes passam, incluindo os novos.

- [ ] **Step 5: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/user/application/use-case/active-user.usecase.ts \
        apps/backend/src/user/application/use-case/active-user.usecase.test.ts
git commit -m "feat(login-security-lockout): limpar Redis lock no ActiveUserUseCase ao ativar conta"
```

## Critérios de Sucesso

- `ActiveUserUseCase` limpa `login:locked:{userId}` do Redis ao ativar um usuário
- Ativação de usuário não bloqueado funciona sem erros
- `pnpm --filter backend test:run` passa sem regressões [RF-014, RF-015]
