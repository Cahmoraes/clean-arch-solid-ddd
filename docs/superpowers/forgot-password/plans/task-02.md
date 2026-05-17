# Task 2: PasswordResetTokenStore – interface e implementação Redis [RF-003, RF-004, RF-005, RF-010]

**Status:** DONE
**PRD:** `../prd/prd-forgot-password.md`
**Spec:** `../specs/forgot-password-design.md`

## Visão Geral

Cria a porta `PasswordResetTokenStore` (application layer) e o adaptador `RedisPasswordResetTokenStore` (infra layer) que gerencia os dois pares de chaves Redis para reset de senha: token-hash → userId e uid → token-hash. Registra no IoC container.

## Arquivos

- Create: `apps/backend/src/user/application/persistence/password-reset-token-store.ts`
- Create: `apps/backend/src/user/infra/gateway/redis-password-reset-token-store.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: a interface existe para desacoplar o use case do Redis concreto
- test-antipatterns: crie `InMemoryPasswordResetTokenStore` para testes (sem mockar Redis)

## Passos

- [ ] **Step 1: Criar a interface `PasswordResetTokenStore`**

Crie `apps/backend/src/user/application/persistence/password-reset-token-store.ts`:

```ts
export interface PasswordResetTokenStore {
  saveResetToken(userId: string, tokenHash: string, ttl: number): Promise<void>
  saveUidMapping(userId: string, tokenHash: string, ttl: number): Promise<void>
  findUserIdByTokenHash(tokenHash: string): Promise<string | null>
  findTokenHashByUserId(userId: string): Promise<string | null>
  deleteResetToken(tokenHash: string): Promise<void>
  deleteUidMapping(userId: string): Promise<void>
}
```

- [ ] **Step 2: Criar `RedisPasswordResetTokenStore`**

Crie `apps/backend/src/user/infra/gateway/redis-password-reset-token-store.ts`:

```ts
import { inject, injectable } from "inversify"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

const TOKEN_PREFIX = "pwd-reset"
const UID_PREFIX = "pwd-reset:uid"

@injectable()
export class RedisPasswordResetTokenStore implements PasswordResetTokenStore {
  constructor(
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async saveResetToken(
    userId: string,
    tokenHash: string,
    ttl: number,
  ): Promise<void> {
    await this.cacheDB.set(`${TOKEN_PREFIX}:${tokenHash}`, userId, ttl)
  }

  public async saveUidMapping(
    userId: string,
    tokenHash: string,
    ttl: number,
  ): Promise<void> {
    await this.cacheDB.set(`${UID_PREFIX}:${userId}`, tokenHash, ttl)
  }

  public async findUserIdByTokenHash(
    tokenHash: string,
  ): Promise<string | null> {
    return this.cacheDB.get<string>(`${TOKEN_PREFIX}:${tokenHash}`)
  }

  public async findTokenHashByUserId(userId: string): Promise<string | null> {
    return this.cacheDB.get<string>(`${UID_PREFIX}:${userId}`)
  }

  public async deleteResetToken(tokenHash: string): Promise<void> {
    await this.cacheDB.delete(`${TOKEN_PREFIX}:${tokenHash}`)
  }

  public async deleteUidMapping(userId: string): Promise<void> {
    await this.cacheDB.delete(`${UID_PREFIX}:${userId}`)
  }
}
```

- [ ] **Step 3: Criar `InMemoryPasswordResetTokenStore` (para testes)**

Crie `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store.ts`:

```ts
import { injectable } from "inversify"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"

@injectable()
export class InMemoryPasswordResetTokenStore implements PasswordResetTokenStore {
  private tokenToUser = new Map<string, string>()
  private userToToken = new Map<string, string>()

  public async saveResetToken(
    userId: string,
    tokenHash: string,
    _ttl: number,
  ): Promise<void> {
    this.tokenToUser.set(tokenHash, userId)
  }

  public async saveUidMapping(
    userId: string,
    tokenHash: string,
    _ttl: number,
  ): Promise<void> {
    this.userToToken.set(userId, tokenHash)
  }

  public async findUserIdByTokenHash(
    tokenHash: string,
  ): Promise<string | null> {
    return this.tokenToUser.get(tokenHash) ?? null
  }

  public async findTokenHashByUserId(userId: string): Promise<string | null> {
    return this.userToToken.get(userId) ?? null
  }

  public async deleteResetToken(tokenHash: string): Promise<void> {
    this.tokenToUser.delete(tokenHash)
  }

  public async deleteUidMapping(userId: string): Promise<void> {
    this.userToToken.delete(userId)
  }

  public clear(): void {
    this.tokenToUser.clear()
    this.userToToken.clear()
  }
}
```

- [ ] **Step 4: Adicionar símbolo IoC em `user-types.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts` e adicione em `Gateways` (crie a seção se não existir) e em `Notifications`:

```ts
export const USER_TYPES = {
  Repositories: {
    User: Symbol.for("UserRepository"),
  },
  PG: {
    User: Symbol.for("PgUserRepository"),
  },
  UseCases: {
    CreateUser: Symbol.for("CreateUserUseCase"),
    UpdateUser: Symbol.for("UpdateUserUseCase"),
    DeleteUser: Symbol.for("DeleteUserUseCase"),
    FetchUsers: Symbol.for("FetchUsersUseCase"),
    UserProfile: Symbol.for("UserProfileUseCase"),
    ChangePassword: Symbol.for("ChangePasswordUseCase"),
    CreatePasswordReauthGrant: Symbol.for("CreatePasswordReauthGrantUseCase"),
    DefinePassword: Symbol.for("DefinePasswordUseCase"),
    ActivateUser: Symbol.for("ActivateUserUseCase"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileUseCase"),
    SuspendUser: Symbol.for("SuspendUserUseCase"),
    UserMetrics: Symbol.for("UserMetricsUseCase"),
    ForgotPassword: Symbol.for("ForgotPasswordUseCase"),       // NEW
    ResetPassword: Symbol.for("ResetPasswordUseCase"),         // NEW
  },
  Controllers: {
    CreateUser: Symbol.for("UserController"),
    UserProfile: Symbol.for("UserProfileController"),
    ChangePassword: Symbol.for("ChangePasswordController"),
    CreatePasswordReauthGrant: Symbol.for(
      "CreatePasswordReauthGrantController",
    ),
    DefinePassword: Symbol.for("DefinePasswordController"),
    FetchUsers: Symbol.for("FetchUsersController"),
    UpdateUserProfile: Symbol.for("UpdateUserProfileController"),
    ActivateUser: Symbol.for("ActivateUserController"),
    SuspendUser: Symbol.for("SuspendUserController"),
    MyProfile: Symbol.for("MyProfileController"),
    UserMetrics: Symbol.for("UserMetricsController"),
    ForgotPassword: Symbol.for("ForgotPasswordController"),    // NEW
    ResetPassword: Symbol.for("ResetPasswordController"),      // NEW
  },
  DAO: {
    User: Symbol.for("UserDAO"),
  },
  Gateways: {
    PasswordResetTokenStore: Symbol.for("PasswordResetTokenStore"), // NEW
  },
  Notifications: {
    SendWelcomeEmail: Symbol.for("SendWelcomeEmailNotification"),
    SendPasswordAlertEmail: Symbol.for("SendPasswordAlertEmailNotification"),
    SendPasswordResetEmail: Symbol.for("SendPasswordResetEmailNotification"), // NEW
  },
} as const
```

- [ ] **Step 5: Registrar binding no `user-module.ts`**

Abra `apps/backend/src/shared/infra/ioc/module/user/user-module.ts` e adicione os imports e bindings. No bloco de imports existente, adicione:

```ts
import { RedisPasswordResetTokenStore } from "@/user/infra/gateway/redis-password-reset-token-store"
```

E dentro do `ContainerModule`, no bloco de bindings existente, adicione:

```ts
bind(USER_TYPES.Gateways.PasswordResetTokenStore)
  .to(RedisPasswordResetTokenStore)
  .inSingletonScope()
```

- [ ] **Step 6: Escrever testes unitários para `InMemoryPasswordResetTokenStore`**

Crie `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store.test.ts`:

```ts
import { InMemoryPasswordResetTokenStore } from "./in-memory-password-reset-token-store"

describe("InMemoryPasswordResetTokenStore", () => {
  let sut: InMemoryPasswordResetTokenStore

  beforeEach(() => {
    sut = new InMemoryPasswordResetTokenStore()
  })

  test("findUserIdByTokenHash retorna null para hash desconhecido", async () => {
    await expect(sut.findUserIdByTokenHash("hash-x")).resolves.toBeNull()
  })

  test("saveResetToken e findUserIdByTokenHash funcionam corretamente", async () => {
    await sut.saveResetToken("user-1", "hash-abc", 900)
    await expect(sut.findUserIdByTokenHash("hash-abc")).resolves.toBe("user-1")
  })

  test("saveUidMapping e findTokenHashByUserId funcionam corretamente", async () => {
    await sut.saveUidMapping("user-1", "hash-abc", 900)
    await expect(sut.findTokenHashByUserId("user-1")).resolves.toBe("hash-abc")
  })

  test("deleteResetToken remove o mapeamento hash → userId", async () => {
    await sut.saveResetToken("user-1", "hash-abc", 900)
    await sut.deleteResetToken("hash-abc")
    await expect(sut.findUserIdByTokenHash("hash-abc")).resolves.toBeNull()
  })

  test("deleteUidMapping remove o mapeamento userId → hash", async () => {
    await sut.saveUidMapping("user-1", "hash-abc", 900)
    await sut.deleteUidMapping("user-1")
    await expect(sut.findTokenHashByUserId("user-1")).resolves.toBeNull()
  })

  test("saveResetToken não afeta o mapeamento uid", async () => {
    await sut.saveResetToken("user-1", "hash-abc", 900)
    await expect(sut.findTokenHashByUserId("user-1")).resolves.toBeNull()
  })
})
```

- [ ] **Step 7: Executar testes**

```bash
cd apps/backend
pnpm test:run -- --reporter=verbose src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store.test.ts
```

Esperado: 6 testes passam.

- [ ] **Step 8: Verificar TypeScript**

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/user/application/persistence/password-reset-token-store.ts \
        apps/backend/src/user/infra/gateway/redis-password-reset-token-store.ts \
        apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store.ts \
        apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store.test.ts \
        apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts
git commit -m "feat(user): add PasswordResetTokenStore port and Redis adapter

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Interface `PasswordResetTokenStore` com 6 métodos no application layer
- `RedisPasswordResetTokenStore` usa prefixos `pwd-reset:{hash}` e `pwd-reset:uid:{userId}`
- `InMemoryPasswordResetTokenStore` implementa todos os métodos sem Redis
- Símbolo `USER_TYPES.Gateways.PasswordResetTokenStore` existe e está bound no container
- 6 testes unitários passam; `pnpm tsc:check` sem erros
