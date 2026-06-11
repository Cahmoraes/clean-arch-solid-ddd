# Task 4: ResetPasswordUseCase + testes unitários [RF-008, RF-009, RF-010, RF-011, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Implementa `ResetPasswordUseCase` que: valida o token raw (SHA-256 hash → Redis lookup), busca o usuário, deleta as chaves Redis (uso único), atualiza a senha via `user.changePassword()`, revoga todas as sessões via `revokedTokenDAO.revokeAllForUser()`, e publica `PasswordChangedEvent` (que aciona o email de alerta já existente).

## Arquivos

- Create: `apps/backend/src/user/application/use-case/reset-password.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/reset-password.usecase.test.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escreva os testes antes da implementação
- no-workarounds: não faça bypass da validação bcrypt — use `user.changePassword()` que é assíncrono
- test-antipatterns: use `InMemoryPasswordResetTokenStore` e `RevokedTokenDAOMemory`

## Passos

- [ ] **Step 1: Escrever os testes unitários ANTES da implementação**

Crie `apps/backend/src/user/application/use-case/reset-password.usecase.test.ts`:

```ts
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { createHash, randomBytes } from "node:crypto"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { RevokedTokenDAOMemory } from "@/shared/infra/database/dao/in-memory/revoked-token-dao-memory"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { InvalidResetTokenError } from "@/user/application/error/invalid-reset-token-error"
import type {
  ResetPasswordUseCase,
  ResetPasswordUseCaseInput,
} from "./reset-password.usecase"

const PASSWORD_RESET_TTL = 900

function makeTokenPair(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  return { rawToken, tokenHash }
}

describe("ResetPasswordUseCase", () => {
  let sut: ResetPasswordUseCase
  let userRepository: InMemoryUserRepository
  let tokenStore: InMemoryPasswordResetTokenStore
  let revokedTokenDAO: RevokedTokenDAOMemory

  beforeEach(() => {
    container.snapshot()
    const repos = setupInMemoryRepositories()
    userRepository = repos.userRepository

    tokenStore = new InMemoryPasswordResetTokenStore()
    container
      .rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
      .toConstantValue(tokenStore)

    revokedTokenDAO = new RevokedTokenDAOMemory()
    container
      .rebind(AUTH_TYPES.DAO.RevokedToken)
      .toConstantValue(revokedTokenDAO)

    sut = container.get<ResetPasswordUseCase>(USER_TYPES.UseCases.ResetPassword)
  })

  afterEach(() => {
    container.restore()
  })

  test("token válido → senha atualizada com sucesso", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeTokenPair()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    const result = await sut.execute({
      token: rawToken,
      newPassword: "NewPass456!",
    })

    expect(result.isSuccess()).toBe(true)
    const updatedUser = await userRepository.userOfId(user.id)
    await expect(updatedUser!.checkPassword("NewPass456!")).resolves.toBe(true)
  })

  test("token inválido → retorna InvalidResetTokenError", async () => {
    const result = await sut.execute({
      token: "token-invalido",
      newPassword: "NewPass456!",
    })

    expect(result.isFailure()).toBe(true)
    expect(result.forceFailure().value).toBeInstanceOf(InvalidResetTokenError)
  })

  test("token é de uso único → segundo uso retorna InvalidResetTokenError", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeTokenPair()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    await sut.execute({ token: rawToken, newPassword: "NewPass456!" })

    const secondResult = await sut.execute({
      token: rawToken,
      newPassword: "AnotherPass789!",
    })

    expect(secondResult.isFailure()).toBe(true)
    expect(secondResult.forceFailure().value).toBeInstanceOf(InvalidResetTokenError)
  })

  test("chaves Redis são deletadas após uso bem-sucedido", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeTokenPair()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    await sut.execute({ token: rawToken, newPassword: "NewPass456!" })

    await expect(tokenStore.findUserIdByTokenHash(tokenHash)).resolves.toBeNull()
    await expect(tokenStore.findTokenHashByUserId(user.id)).resolves.toBeNull()
  })

  test("todas as sessões são revogadas após reset bem-sucedido", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
      password: "OldPass123!",
    })
    const { rawToken, tokenHash } = makeTokenPair()
    await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
    await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

    await sut.execute({ token: rawToken, newPassword: "NewPass456!" })

    await expect(revokedTokenDAO.isAllRevokedForUser(user.id)).resolves.toBe(true)
  })
})
```

- [ ] **Step 2: Executar testes para confirmar que falham**

```bash
cd apps/backend
pnpm test:run -- src/user/application/use-case/reset-password.usecase.test.ts
```

Esperado: FAIL com "Cannot find module" ou similar.

- [ ] **Step 3: Implementar `ResetPasswordUseCase`**

Crie `apps/backend/src/user/application/use-case/reset-password.usecase.ts`:

```ts
import { createHash } from "node:crypto"
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either.js"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao.js"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import type { Queue } from "@/shared/infra/queue/queue.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"
import type { PasswordChangedEvent } from "@/user/domain/event/password-changed-event.js"
import type { UserRepository } from "../persistence/repository/user-repository.js"
import { InvalidResetTokenError } from "../error/invalid-reset-token-error.js"
import { UserNotFoundError } from "../error/user-not-found-error.js"

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60

export interface ResetPasswordUseCaseInput {
  token: string
  newPassword: string
}

export type ResetPasswordUseCaseOutput = Either<
  InvalidResetTokenError | UserNotFoundError,
  null
>

@injectable()
export class ResetPasswordUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(USER_TYPES.Gateways.PasswordResetTokenStore)
    private readonly tokenStore: PasswordResetTokenStore,
    @inject(AUTH_TYPES.DAO.RevokedToken)
    private readonly revokedTokenDAO: RevokedTokenDAO,
    @inject(SHARED_TYPES.Queue)
    private readonly queue: Queue,
  ) {
    this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
  }

  public async execute(
    input: ResetPasswordUseCaseInput,
  ): Promise<ResetPasswordUseCaseOutput> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex")
    const userId = await this.tokenStore.findUserIdByTokenHash(tokenHash)

    if (!userId) {
      return failure(new InvalidResetTokenError())
    }

    const user = await this.userRepository.userOfId(userId)
    if (!user) {
      return failure(new UserNotFoundError())
    }

    // Delete token keys BEFORE updating password (one-time use guarantee)
    await this.tokenStore.deleteResetToken(tokenHash)
    await this.tokenStore.deleteUidMapping(userId)

    user.subscribe(this.handlePasswordChangedEvent)
    const changePasswordResult = await user.changePassword(input.newPassword)
    if (changePasswordResult.isFailure()) {
      return failure(changePasswordResult.value as UserNotFoundError)
    }

    await this.userRepository.update(user)
    await this.revokedTokenDAO.revokeAllForUser(userId, SEVEN_DAYS_IN_SECONDS)

    return success(null)
  }

  private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
    void DomainEventPublisher.instance.publish(data)
    this.queue.publish(data.eventName, data)
  }
}
```

- [ ] **Step 4: Registrar no `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicione o import:

```ts
import { ResetPasswordUseCase } from "@/user/application/use-case/reset-password.usecase"
```

E dentro do `ContainerModule`:

```ts
bind(USER_TYPES.UseCases.ResetPassword).to(ResetPasswordUseCase)
```

- [ ] **Step 5: Executar os testes**

```bash
cd apps/backend
pnpm test:run -- --reporter=verbose src/user/application/use-case/reset-password.usecase.test.ts
```

Esperado: 5 testes passam.

- [ ] **Step 6: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/application/use-case/reset-password.usecase.ts \
        apps/backend/src/user/application/use-case/reset-password.usecase.test.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts
git commit -m "feat(user): add ResetPasswordUseCase with one-time token and session revocation

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-008: use case aceita `{ token, newPassword }` e chama `userRepository.update()`
- RF-009: token inválido → `InvalidResetTokenError`
- RF-010: token deletado do Redis antes de atualizar a senha (uso único garantido)
- RF-011: `user.changePassword()` aplica validação da Password VO
- RF-012: `revokedTokenDAO.revokeAllForUser()` chamado após reset bem-sucedido
- RF-013: `PasswordChangedEvent` publicado → `SendPasswordAlertEmailNotification` acionado automaticamente
- 5 testes unitários passam; `pnpm tsc:check` sem erros
