# Task 4: `LoginAttemptStore` interface + `RedisLoginAttemptStore` + IoC [RF-001, RF-002, RF-003, RF-004]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Cria a abstração `LoginAttemptStore` (interface de application layer) e sua implementação Redis para rastrear tentativas de login falhas e o estado de lock. As chaves Redis são `login:failed:{email}` (contador com TTL deslizante de 15 min) e `login:locked:{userId}` (flag de lock sem TTL). Registra no IoC container.

## Arquivos

- Create: `apps/backend/src/user/application/persistence/login-attempt-store.ts`
- Create: `apps/backend/src/user/infra/gateway/redis-login-attempt-store.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

### Conformidade com as Skills Padrão

- no-workarounds: interface correta, implementação via `CacheDB` existente (não acessar Redis diretamente)

## Passos

- [ ] **Step 1: Escrever testes para `RedisLoginAttemptStore`**

Arquivo: `apps/backend/src/user/infra/gateway/redis-login-attempt-store.test.ts`

```typescript
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"

describe("RedisLoginAttemptStore", () => {
  let sut: LoginAttemptStore
  let cacheDB: CacheDB

  beforeEach(() => {
    container.snapshot()
    sut = container.get(USER_TYPES.Gateways.LoginAttemptStore)
    cacheDB = container.get(SHARED_TYPES.Redis)
  })

  afterEach(() => {
    container.restore()
  })

  test("increment deve retornar 1 na primeira chamada", async () => {
    const count = await sut.increment("test@test.com", 900)
    expect(count).toBe(1)
  })

  test("increment deve acumular contagem", async () => {
    await sut.increment("test@test.com", 900)
    await sut.increment("test@test.com", 900)
    const count = await sut.increment("test@test.com", 900)
    expect(count).toBe(3)
  })

  test("deleteFailedAttempts deve zerar o contador", async () => {
    await sut.increment("test@test.com", 900)
    await sut.deleteFailedAttempts("test@test.com")
    const count = await sut.increment("test@test.com", 900)
    expect(count).toBe(1)
  })

  test("setLocked deve criar a chave de lock", async () => {
    await sut.setLocked("user-123")
    const locked = await sut.isLocked("user-123")
    expect(locked).toBe(true)
  })

  test("isLocked deve retornar false quando não bloqueado", async () => {
    const locked = await sut.isLocked("user-not-locked")
    expect(locked).toBe(false)
  })

  test("deleteLock deve remover a chave de lock", async () => {
    await sut.setLocked("user-123")
    await sut.deleteLock("user-123")
    const locked = await sut.isLocked("user-123")
    expect(locked).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
pnpm --filter backend test:run -- -t "RedisLoginAttemptStore"
```

Esperado: FAIL — `USER_TYPES.Gateways.LoginAttemptStore` não existe ainda.

- [ ] **Step 3: Criar a interface `LoginAttemptStore`**

Arquivo: `apps/backend/src/user/application/persistence/login-attempt-store.ts`

```typescript
export interface LoginAttemptStore {
  increment(email: string, ttlSeconds: number): Promise<number>
  deleteFailedAttempts(email: string): Promise<void>
  setLocked(userId: string): Promise<void>
  isLocked(userId: string): Promise<boolean>
  deleteLock(userId: string): Promise<void>
}
```

- [ ] **Step 4: Criar `RedisLoginAttemptStore`**

Arquivo: `apps/backend/src/user/infra/gateway/redis-login-attempt-store.ts`

```typescript
import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"

const FAILED_PREFIX = "login:failed"
const LOCKED_PREFIX = "login:locked"

@injectable()
export class RedisLoginAttemptStore implements LoginAttemptStore {
  constructor(
    @inject(SHARED_TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async increment(email: string, ttlSeconds: number): Promise<number> {
    const key = this.failedKey(email)
    const current = await this.cacheDB.get<number>(key)
    const next = (current ?? 0) + 1
    await this.cacheDB.set(key, next, ttlSeconds)
    return next
  }

  public async deleteFailedAttempts(email: string): Promise<void> {
    await this.cacheDB.delete(this.failedKey(email))
  }

  public async setLocked(userId: string): Promise<void> {
    // Sem TTL: lock permanente até ação explícita
    // CacheDB.set com ttl=0 ou ttl muito alto; verificar a API do CacheDB disponível.
    // Se CacheDB não suportar "sem TTL", usar TTL de 1 ano (31536000 segundos).
    await this.cacheDB.set(this.lockedKey(userId), true, 31_536_000)
  }

  public async isLocked(userId: string): Promise<boolean> {
    const value = await this.cacheDB.get<boolean>(this.lockedKey(userId))
    return value === true
  }

  public async deleteLock(userId: string): Promise<void> {
    await this.cacheDB.delete(this.lockedKey(userId))
  }

  private failedKey(email: string): string {
    return `${FAILED_PREFIX}:${email}`
  }

  private lockedKey(userId: string): string {
    return `${LOCKED_PREFIX}:${userId}`
  }
}
```

> **Nota sobre TTL do lock:** O `CacheDB` existente usa `cacheDB.set(key, value, ttl)`. Se a interface `CacheDB` não suportar TTL indefinido, usar `31_536_000` (1 ano) como approximação "sem expiração". Verificar a assinatura da interface antes de implementar. Se existir `cacheDB.setWithoutTTL(key, value)`, usar essa.

- [ ] **Step 5: Adicionar símbolo `LoginAttemptStore` em `user-types.ts`**

Arquivo: `apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts`

Dentro de `USER_TYPES.Gateways`, adicionar:

```typescript
Gateways: {
  PasswordResetTokenStore: Symbol.for("PasswordResetTokenStore"),
  LoginAttemptStore: Symbol.for("LoginAttemptStore"),
},
```

- [ ] **Step 6: Registrar `RedisLoginAttemptStore` no container**

Arquivo: `apps/backend/src/shared/infra/ioc/module/user/user-module.ts`

Adicionar import no topo:

```typescript
import { RedisLoginAttemptStore } from "@/user/infra/gateway/redis-login-attempt-store"
```

Adicionar binding (junto com `PasswordResetTokenStore`):

```typescript
bind(USER_TYPES.Gateways.LoginAttemptStore)
  .to(RedisLoginAttemptStore)
  .inSingletonScope()
```

- [ ] **Step 7: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "RedisLoginAttemptStore"
```

Esperado: PASS — todos os 6 testes passam.

- [ ] **Step 8: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/user/application/persistence/login-attempt-store.ts \
        apps/backend/src/user/infra/gateway/redis-login-attempt-store.ts \
        apps/backend/src/user/infra/gateway/redis-login-attempt-store.test.ts \
        apps/backend/src/shared/infra/ioc/module/service-identifier/user-types.ts \
        apps/backend/src/shared/infra/ioc/module/user/user-module.ts
git commit -m "feat(login-security-lockout): adicionar LoginAttemptStore e RedisLoginAttemptStore"
```

## Critérios de Sucesso

- `LoginAttemptStore` interface com 5 métodos corretos
- `RedisLoginAttemptStore` usa chaves `login:failed:{email}` e `login:locked:{userId}`
- `USER_TYPES.Gateways.LoginAttemptStore` existe
- Testes da store passam
- `pnpm --filter backend test:run` passa sem regressões [RF-001, RF-002, RF-003, RF-004]
