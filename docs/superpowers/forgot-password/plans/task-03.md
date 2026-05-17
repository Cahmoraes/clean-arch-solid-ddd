# Task 3: ForgotPasswordUseCase + testes unitários [RF-001, RF-002, RF-003, RF-004, RF-006, RF-007]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Implementa o `ForgotPasswordUseCase` que: verifica se o email existe, aplica rate limiting por email, invalida token anterior, gera token CSPRNG (256-bit), armazena hash SHA-256 no Redis via `PasswordResetTokenStore`, e publica `PasswordResetRequestedEvent` para que a notificação de email seja enviada. Sempre retorna `success(null)` (sem enumerar usuários).

## Arquivos

- Create: `apps/backend/src/user/application/error/invalid-reset-token-error.ts`
- Create: `apps/backend/src/user/domain/event/password-reset-requested-event.ts`
- Modify: `apps/backend/src/shared/domain/event/events.ts`
- Create: `apps/backend/src/user/application/use-case/forgot-password.usecase.ts`
- Create: `apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts`
- Modify: `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escreva o teste antes da implementação
- test-antipatterns: use `InMemoryUserRepository` e `InMemoryPasswordResetTokenStore`; não mocke `DomainEventPublisher`

## Passos

- [ ] **Step 1: Criar `InvalidResetTokenError`**

Crie `apps/backend/src/user/application/error/invalid-reset-token-error.ts`:

```ts
export class InvalidResetTokenError extends Error {
  constructor() {
    super("Invalid or expired password reset token")
    this.name = "InvalidResetTokenError"
  }
}
```

- [ ] **Step 2: Adicionar `PASSWORD_RESET_REQUESTED` ao EVENTS**

Abra `apps/backend/src/shared/domain/event/events.ts` e adicione o novo evento:

```ts
export const EVENTS = {
  USER_CREATED: "userCreated",
  PASSWORD_CHANGED: "passwordChanged",
  CHECK_IN_CREATED: "checkInCreated",
  CHECK_IN_REJECTED: "checkInRejected",
  USER_PROFILE_UPDATED: "userProfileUpdated",
  USER_ASSIGNED_BILLING_CUSTOMER_ID: "userAssignedBillingCustomerID",
  GOOGLE_ACCOUNT_LINKED: "googleAccountLinked",
  PASSWORD_RESET_REQUESTED: "passwordResetRequested",  // NEW
} as const

export type EventTypes = (typeof EVENTS)[keyof typeof EVENTS]
```

- [ ] **Step 3: Criar `PasswordResetRequestedEvent`**

Crie `apps/backend/src/user/domain/event/password-reset-requested-event.ts`:

```ts
import { DomainEvent } from "@/shared/domain/event/domain-event.js"
import { EVENTS } from "@/shared/domain/event/events.js"

export interface PasswordResetRequestedEventProps {
  userEmail: string
  userName: string
  rawToken: string
}

export class PasswordResetRequestedEvent extends DomainEvent<PasswordResetRequestedEventProps> {
  readonly payload: PasswordResetRequestedEventProps

  constructor(props: PasswordResetRequestedEventProps) {
    super(EVENTS.PASSWORD_RESET_REQUESTED)
    this.payload = props
  }

  public toJSON() {
    return {
      id: this.id,
      eventName: this.eventName,
      date: this.date,
      payload: this.payload,
    }
  }
}
```

- [ ] **Step 4: Escrever o teste unitário ANTES da implementação**

Crie `apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts`:

```ts
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import {
  DomainEventPublisher,
  type Subscriber,
} from "@/shared/domain/event/domain-event-publisher"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event"
import type {
  ForgotPasswordUseCase,
  ForgotPasswordUseCaseInput,
} from "./forgot-password.usecase"

describe("ForgotPasswordUseCase", () => {
  let sut: ForgotPasswordUseCase
  let userRepository: InMemoryUserRepository
  let tokenStore: InMemoryPasswordResetTokenStore

  beforeEach(() => {
    container.snapshot()
    const repos = setupInMemoryRepositories()
    userRepository = repos.userRepository
    tokenStore = new InMemoryPasswordResetTokenStore()
    container
      .rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
      .toConstantValue(tokenStore)
    sut = container.get<ForgotPasswordUseCase>(
      USER_TYPES.UseCases.ForgotPassword,
    )
  })

  afterEach(() => {
    container.restore()
  })

  test("retorna success(null) para email inexistente (sem enumeração)", async () => {
    const result = await sut.execute({ email: "nao-existe@test.com" })
    expect(result.isSuccess()).toBe(true)
    expect(result.value).toBeNull()
  })

  test("retorna success(null) e gera token para email válido", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
    })

    const result = await sut.execute({ email: user.email })

    expect(result.isSuccess()).toBe(true)
    const hash = await tokenStore.findTokenHashByUserId(user.id)
    expect(hash).not.toBeNull()
  })

  test("invalida token anterior ao gerar novo", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
    })

    await sut.execute({ email: user.email })
    const firstHash = await tokenStore.findTokenHashByUserId(user.id)

    await sut.execute({ email: user.email })
    const secondHash = await tokenStore.findTokenHashByUserId(user.id)

    expect(firstHash).not.toBeNull()
    expect(secondHash).not.toBeNull()
    expect(firstHash).not.toBe(secondHash)
    // primeiro hash deve ter sido deletado
    const userIdFromFirstHash = await tokenStore.findUserIdByTokenHash(firstHash!)
    expect(userIdFromFirstHash).toBeNull()
  })

  test("publica PasswordResetRequestedEvent ao gerar token", async () => {
    const user = await createAndSaveUser({
      userRepository,
      email: "user@test.com",
    })

    let receivedEvent: PasswordResetRequestedEvent | null = null
    const subscriber: Subscriber<unknown> = (event) => {
      if (event instanceof PasswordResetRequestedEvent) {
        receivedEvent = event
      }
    }
    DomainEventPublisher.instance.subscribe(
      "passwordResetRequested",
      subscriber,
    )

    try {
      await sut.execute({ email: user.email })
    } finally {
      DomainEventPublisher.instance.unsubscribe(
        "passwordResetRequested",
        subscriber,
      )
    }

    expect(receivedEvent).not.toBeNull()
    expect(receivedEvent!.payload.userEmail).toBe(user.email)
    expect(receivedEvent!.payload.rawToken).toBeDefined()
    expect(receivedEvent!.payload.rawToken.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 5: Verificar que o teste falha (use case não existe ainda)**

```bash
cd apps/backend
pnpm test:run -- src/user/application/use-case/forgot-password.usecase.test.ts
```

Esperado: FAIL com erro "Cannot find module" ou "ForgotPasswordUseCase is not defined".

- [ ] **Step 6: Adicionar FORGOT_PASSWORD ao `rate-limit-config.ts`**

Abra `apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts`:

```ts
export const RATE_LIMIT_CONFIG = {
  AUTH: {
    MAX_MEMBER: 20,
    MAX_ADMIN: 60,
    TIME_WINDOW: 15 * 60 * 1000,
  },
  GENERAL: {
    MAX_MEMBER: 100,
    MAX_ADMIN: 300,
    TIME_WINDOW: 15 * 60 * 1000,
  },
  FORGOT_PASSWORD: {         // NEW
    MAX: 5,
    TIME_WINDOW: 15 * 60 * 1000, // 15 minutos em ms
    EMAIL_MAX: 3,
    EMAIL_TIME_WINDOW_SECONDS: 60 * 60, // 1 hora em segundos (para Redis TTL)
  },
  ADMIN_MULTIPLIER: 3,
  REDIS_NAMESPACE: "rl:",
} as const

export interface RateLimitRouteConfig {
  max?: number | ((request: any, key: string) => number)
  timeWindow?: string | number
}

export interface RateLimitExceededEvent {
  ip: string
  route: string
  method: string
  userId?: string
  role?: string
  timestamp: string
}
```

- [ ] **Step 7: Implementar `ForgotPasswordUseCase`**

Crie `apps/backend/src/user/application/use-case/forgot-password.usecase.ts`:

```ts
import { createHash, randomBytes } from "node:crypto"
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
  type Either,
  success,
} from "@/shared/domain/value-object/either.js"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types.js"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event.js"
import type { UserRepository } from "../persistence/repository/user-repository.js"

const PASSWORD_RESET_TTL_IN_SECONDS = 900 // 15 minutos

export interface ForgotPasswordUseCaseInput {
  email: string
}

export type ForgotPasswordUseCaseOutput = Either<never, null>

@injectable()
export class ForgotPasswordUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(USER_TYPES.Gateways.PasswordResetTokenStore)
    private readonly tokenStore: PasswordResetTokenStore,
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async execute(
    input: ForgotPasswordUseCaseInput,
  ): Promise<ForgotPasswordUseCaseOutput> {
    const user = await this.userRepository.userOfEmail(input.email)

    if (!user) {
      return success(null)
    }

    const rateLimitKey = `rl:forgot:email:${input.email}`
    const emailRateLimitExceeded = await this.checkEmailRateLimit(rateLimitKey)
    if (emailRateLimitExceeded) {
      return success(null)
    }

    await this.invalidatePreviousToken(user.id)

    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")

    await this.tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL_IN_SECONDS)
    await this.tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL_IN_SECONDS)

    DomainEventPublisher.instance.publish(
      new PasswordResetRequestedEvent({
        userEmail: user.email,
        userName: user.name,
        rawToken,
      }),
    )

    return success(null)
  }

  private async checkEmailRateLimit(key: string): Promise<boolean> {
    const count = (await this.cacheDB.get<number>(key)) ?? 0
    if (count >= RATE_LIMIT_CONFIG.FORGOT_PASSWORD.EMAIL_MAX) {
      return true
    }
    await this.cacheDB.set(
      key,
      count + 1,
      RATE_LIMIT_CONFIG.FORGOT_PASSWORD.EMAIL_TIME_WINDOW_SECONDS,
    )
    return false
  }

  private async invalidatePreviousToken(userId: string): Promise<void> {
    const previousHash = await this.tokenStore.findTokenHashByUserId(userId)
    if (previousHash) {
      await this.tokenStore.deleteResetToken(previousHash)
    }
  }
}
```

- [ ] **Step 8: Registrar no `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`, adicione o import:

```ts
import { ForgotPasswordUseCase } from "@/user/application/use-case/forgot-password.usecase"
```

E dentro do `ContainerModule`:

```ts
bind(USER_TYPES.UseCases.ForgotPassword).to(ForgotPasswordUseCase)
```

- [ ] **Step 9: Executar os testes**

```bash
cd apps/backend
pnpm test:run -- --reporter=verbose src/user/application/use-case/forgot-password.usecase.test.ts
```

Esperado: 4 testes passam.

- [ ] **Step 10: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 11: Commit**

```bash
git add apps/backend/src/user/application/error/invalid-reset-token-error.ts \
        apps/backend/src/user/domain/event/password-reset-requested-event.ts \
        apps/backend/src/shared/domain/event/events.ts \
        apps/backend/src/user/application/use-case/forgot-password.usecase.ts \
        apps/backend/src/user/application/use-case/forgot-password.usecase.test.ts \
        apps/backend/src/shared/infra/server/plugins/rate-limit-config.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts
git commit -m "feat(user): add ForgotPasswordUseCase with CSPRNG token and rate limiting

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- RF-001: `POST /password/forgot` (via use case) aceita email
- RF-002: retorna sempre `success(null)` independente do email existir
- RF-003: token gerado com `randomBytes(32)` (256 bits) e armazenado como SHA-256 hash
- RF-004: token anterior invalidado via `deleteResetToken` + `findTokenHashByUserId`
- RF-005: TTL de 900 segundos (15 minutos)
- RF-006: rate limiting por email via Redis counter (max 3 req/1h)
- `PasswordResetRequestedEvent` publicado com `rawToken`, `userEmail`, `userName`
- 4 testes unitários passam; `pnpm tsc:check` sem erros
