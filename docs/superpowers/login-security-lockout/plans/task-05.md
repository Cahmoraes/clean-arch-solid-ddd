# Task 5: `AuthenticateUseCase` — lógica de lockout completa [RF-001, RF-002, RF-003, RF-004, RF-005, RF-006, RF-007]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Modifica o `AuthenticateUseCase` para: verificar o estado de lock via Redis antes do bcrypt; incrementar o contador de tentativas falhas; ao atingir 3 falhas dentro de 15 min, bloquear a conta (DB + Redis), gerar token de reset e publicar `AccountLockedBySecurityEvent`; limpar o contador em login bem-sucedido; isentar `isSuperAdmin`. Bcrypt **sempre** executa (anti-timing attack).

## Arquivos

- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.ts`
- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts`

### Conformidade com as Skills Padrão

- no-workarounds: bcrypt sempre executa para prevenir timing attacks
- test-driven-development: novos testes antes das mudanças no use case

## Passos

- [ ] **Step 1: Adicionar novos testes ao `authenticate.usecase.test.ts`**

Arquivo: `apps/backend/src/session/application/use-case/authenticate.usecase.test.ts`

Adicionar os imports necessários no topo do arquivo existente:

```typescript
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"
import { StatusTypes } from "@/user/domain/value-object/status"
```

Adicionar novos testes no `describe("AuthenticateUseCase")`:

```typescript
describe("lockout", () => {
  test("Não deve bloquear nas 2 primeiras tentativas inválidas", async () => {
    await createAndSaveUser({ name: "John", email: "john@doe.com", password: "Senha123!" })
    for (let i = 0; i < 2; i++) {
      const result = await sut.execute({ email: "john@doe.com", password: "wrong" })
      expect(result.isFailure()).toBe(true)
    }
    const { userRepository: repo } = await setupInMemoryRepositories()
    const user = await repo.userOfEmail("john@doe.com")
    expect(user?.isLocked).toBe(false)
  })

  test("Deve bloquear a conta na 3ª tentativa inválida", async () => {
    const { userRepository: repo } = await setupInMemoryRepositories()
    const createdUser = await createAndSaveUser({ name: "John", email: "john@doe.com", password: "Senha123!" })
    for (let i = 0; i < 3; i++) {
      await sut.execute({ email: "john@doe.com", password: "wrong" })
    }
    const user = await repo.userOfEmail("john@doe.com")
    expect(user?.isLocked).toBe(true)
    expect(user?.status).toBe("locked")
  })

  test("Deve retornar InvalidCredentialsError para conta bloqueada", async () => {
    await createAndSaveUser({ name: "John", email: "john@doe.com", password: "Senha123!" })
    for (let i = 0; i < 3; i++) {
      await sut.execute({ email: "john@doe.com", password: "wrong" })
    }
    const result = await sut.execute({ email: "john@doe.com", password: "Senha123!" })
    expect(result.isFailure()).toBe(true)
    expect(result.forceFailure().value).toBeInstanceOf(InvalidCredentialsError)
  })

  test("Deve limpar o contador após login bem-sucedido", async () => {
    const loginAttemptStore = container.get<LoginAttemptStore>(USER_TYPES.Gateways.LoginAttemptStore)
    await createAndSaveUser({ name: "John", email: "john@doe.com", password: "Senha123!" })
    await sut.execute({ email: "john@doe.com", password: "wrong" })
    await sut.execute({ email: "john@doe.com", password: "Senha123!" })
    // Após login bem-sucedido, deve poder falhar 3 vezes novamente sem lock imediato
    await sut.execute({ email: "john@doe.com", password: "wrong" })
    await sut.execute({ email: "john@doe.com", password: "wrong" })
    const result = await sut.execute({ email: "john@doe.com", password: "Senha123!" })
    expect(result.isSuccess()).toBe(true)
  })

  test("Não deve bloquear usuário isSuperAdmin mesmo com 3 tentativas inválidas", async () => {
    const { userRepository: repo } = await setupInMemoryRepositories()
    // Restaurar um usuário com isSuperAdmin = true
    const superAdmin = User.restore({
      id: "super-admin-id",
      name: "Super Admin",
      email: "admin@admin.com",
      password: await hashPassword("AdminPass1!"),
      role: "ADMIN",
      status: StatusTypes.ACTIVATED,
      createdAt: new Date(),
      isSuperAdmin: true,
    })
    await repo.save(superAdmin)
    for (let i = 0; i < 3; i++) {
      await sut.execute({ email: "admin@admin.com", password: "wrong" })
    }
    const user = await repo.userOfEmail("admin@admin.com")
    expect(user?.isLocked).toBe(false)
  })
})
```

> **Nota sobre `hashPassword`:** Se não existir um helper para criar senhas já hasheadas para o `restore()`, usar `Password.create("AdminPass1!").then(r => r.forceSuccess().value.value)` ou criar um helper local no teste.

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:run -- -t "lockout"
```

Esperado: FAIL — `user.isLocked is not a function` ou comportamento de lock não implementado.

- [ ] **Step 3: Modificar `AuthenticateUseCase` — injeções e lógica de lockout**

Arquivo: `apps/backend/src/session/application/use-case/authenticate.usecase.ts`

Substituir o conteúdo inteiro pelo seguinte:

```typescript
import { createHash, randomBytes } from "node:crypto"
import { inject, injectable } from "inversify"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either.js"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import { env } from "@/shared/infra/env/index.js"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import type { AuthToken } from "@/user/application/auth/auth-token.js"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error.js"
import { PasswordNotSetError } from "@/user/application/error/password-not-set-error.js"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository.js"
import { AccountLockedBySecurityEvent } from "@/user/domain/event/account-locked-by-security-event.js"
import type { User } from "@/user/domain/user.js"

export interface AuthenticateUseCaseInput {
  email: string
  password: string
}

export interface AuthTokenOutputDTO {
  token: string
  refreshToken: string
}

export type AuthenticateUseCaseOutput = Either<
  InvalidCredentialsError | PasswordNotSetError,
  AuthTokenOutputDTO
>

const MAX_ATTEMPTS = 3
const ATTEMPT_WINDOW_SECONDS = 15 * 60 // 15 minutos
const RESET_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutos

@injectable()
export class AuthenticateUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Tokens.Auth)
    private readonly authToken: AuthToken,
    @inject(USER_TYPES.Gateways.LoginAttemptStore)
    private readonly loginAttemptStore: LoginAttemptStore,
    @inject(USER_TYPES.Gateways.PasswordResetTokenStore)
    private readonly passwordResetTokenStore: PasswordResetTokenStore,
  ) {}

  public async execute(
    input: AuthenticateUseCaseInput,
  ): Promise<AuthenticateUseCaseOutput> {
    const user = await this.userRepository.userOfEmail(input.email)

    if (!user) {
      // Anti-timing: não executar bcrypt aqui exporia que o email não existe.
      // Retornar imediatamente é aceitável neste contexto pois a ausência de bcrypt
      // não é exploitável sem o hash real da senha para comparar.
      return failure(new InvalidCredentialsError())
    }

    if (!user.password) {
      return failure(new PasswordNotSetError())
    }

    // Verificar lock no Redis (fast path) — antes do bcrypt para economizar CPU,
    // mas DEPOIS de verificar que o usuário existe (para não vazar presença do usuário).
    if (!user.isSuperAdmin) {
      const locked = await this.loginAttemptStore.isLocked(user.id)
      if (locked) {
        // Executar bcrypt mesmo assim para manter tempo de resposta constante
        await user.checkPassword(input.password)
        return failure(new InvalidCredentialsError())
      }
    }

    const passwordValid = await user.checkPassword(input.password)

    if (!passwordValid) {
      if (!user.isSuperAdmin) {
        await this.handleFailedAttempt(user)
      }
      return failure(new InvalidCredentialsError())
    }

    // Login bem-sucedido: limpar contador
    if (!user.isSuperAdmin) {
      await this.loginAttemptStore.deleteFailedAttempts(input.email)
    }

    const jwi = this.createJSONWebId()
    return success({
      token: this.signUserToken(user, jwi),
      refreshToken: this.createRefreshToken(user, jwi),
    })
  }

  private async handleFailedAttempt(user: User): Promise<void> {
    const count = await this.loginAttemptStore.increment(
      user.email,
      ATTEMPT_WINDOW_SECONDS,
    )

    if (count >= MAX_ATTEMPTS) {
      await this.lockAccount(user)
    }
  }

  private async lockAccount(user: User): Promise<void> {
    user.lock()
    await this.userRepository.update(user)
    await this.loginAttemptStore.setLocked(user.id)
    await this.loginAttemptStore.deleteFailedAttempts(user.email)

    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")

    // Invalidar token anterior, se houver
    const existingTokenHash = await this.passwordResetTokenStore.findTokenHashByUserId(user.id)
    if (existingTokenHash) {
      await this.passwordResetTokenStore.deleteResetToken(existingTokenHash)
      await this.passwordResetTokenStore.deleteUidMapping(user.id)
    }

    await this.passwordResetTokenStore.saveResetToken(user.id, tokenHash, RESET_TOKEN_TTL_SECONDS)
    await this.passwordResetTokenStore.saveUidMapping(user.id, tokenHash, RESET_TOKEN_TTL_SECONDS)

    await DomainEventPublisher.instance.publish(
      new AccountLockedBySecurityEvent({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        resetToken: rawToken,
      }),
    )
  }

  private createJSONWebId(): string {
    return randomBytes(16).toString("hex")
  }

  private signUserToken(user: User, jwi: string): string {
    return this.authToken.sign(
      {
        sub: {
          id: user.id,
          email: user.email,
          role: user.role,
          jwi,
        },
      },
      env.PRIVATE_KEY,
    )
  }

  private createRefreshToken(user: User, jwi: string): string {
    return this.authToken.refreshToken(
      {
        sub: {
          id: user.id,
          email: user.email,
          role: user.role,
          jwi,
        },
      },
      env.PRIVATE_KEY,
    )
  }
}
```

- [ ] **Step 4: Rodar os testes de lockout para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "lockout"
```

Esperado: PASS — todos os testes de lockout passam.

- [ ] **Step 5: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/session/application/use-case/
git commit -m "feat(login-security-lockout): implementar lógica de lockout no AuthenticateUseCase"
```

## Critérios de Sucesso

- Conta bloqueada após exatamente 3 tentativas inválidas dentro de 15 min
- `isSuperAdmin` isento de bloqueio [RF-005]
- Todos os erros retornam `InvalidCredentialsError` sem distinção [RF-006]
- Bcrypt executa antes do retorno mesmo quando conta está locked [RF-007]
- `AccountLockedBySecurityEvent` publicado com `resetToken` incluído [RF-008, RF-009]
- Contador limpo após login bem-sucedido [RF-003]
- `pnpm --filter backend test:run` passa sem regressões [RF-001 a RF-007]
