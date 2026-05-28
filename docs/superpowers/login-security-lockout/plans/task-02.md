# Task 2: User domain — `isSuperAdmin` property + `LockedStatus` no State Pattern + método `lock()` [RF-002, RF-005, RF-016, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Estende o domínio da entidade `User` com três mudanças independentes mas relacionadas: (1) adiciona `isSuperAdmin` como propriedade da entidade; (2) adiciona `locked` ao `StatusTypes` e cria `LockedStatus` no State Pattern com as transições corretas; (3) adiciona `lock()` e `isLocked` à entidade.

## Arquivos

- Modify: `apps/backend/src/user/domain/value-object/status.ts`
- Modify: `apps/backend/src/user/domain/user.ts`
- Test: `apps/backend/src/user/domain/user.test.ts` (criar se não existir)

### Conformidade com as Skills Padrão

- no-workarounds: State Pattern correto, sem `if` de status espalhados pelo código
- test-driven-development: testes antes da implementação

## Passos

- [ ] **Step 1: Escrever os testes para `LockedStatus` e `isSuperAdmin`**

Arquivo: `apps/backend/src/user/domain/user.test.ts`

```typescript
import { User } from "@/user/domain/user"
import { StatusTypes } from "@/user/domain/value-object/status"

describe("User — status locked e isSuperAdmin", () => {
  async function makeUser(overrides: Partial<{
    email: string
    isSuperAdmin: boolean
    status: StatusTypes
  }> = {}) {
    return User.restore({
      id: "user-id-1",
      name: "Test User",
      email: overrides.email ?? "test@test.com",
      role: "MEMBER",
      status: overrides.status ?? StatusTypes.ACTIVATED,
      createdAt: new Date(),
      isSuperAdmin: overrides.isSuperAdmin ?? false,
    })
  }

  test("lock() deve transicionar activated → locked", async () => {
    const user = await makeUser({ status: StatusTypes.ACTIVATED })
    user.lock()
    expect(user.isLocked).toBe(true)
    expect(user.isActive).toBe(false)
    expect(user.status).toBe("locked")
  })

  test("activate() em locked deve transicionar para activated", async () => {
    const user = await makeUser({ status: StatusTypes.LOCKED })
    user.activate()
    expect(user.isActive).toBe(true)
    expect(user.isLocked).toBe(false)
  })

  test("suspend() em locked deve transicionar para suspended", async () => {
    const user = await makeUser({ status: StatusTypes.LOCKED })
    user.suspend()
    expect(user.isSuspend).toBe(true)
    expect(user.isLocked).toBe(false)
  })

  test("lock() em locked deve ser no-op", async () => {
    const user = await makeUser({ status: StatusTypes.LOCKED })
    user.lock()
    expect(user.isLocked).toBe(true)
  })

  test("lock() em suspended deve ser no-op", async () => {
    const user = await makeUser({ status: StatusTypes.SUSPENDED })
    user.lock()
    expect(user.isSuspend).toBe(true)
    expect(user.isLocked).toBe(false)
  })

  test("isSuperAdmin deve retornar true quando restaurado com isSuperAdmin=true", async () => {
    const user = await makeUser({ isSuperAdmin: true })
    expect(user.isSuperAdmin).toBe(true)
  })

  test("isSuperAdmin deve retornar false por padrão", async () => {
    const user = await makeUser()
    expect(user.isSuperAdmin).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:run -- -t "User — status locked e isSuperAdmin"
```

Esperado: FAIL — `StatusTypes.LOCKED is not defined`, `user.lock is not a function`, `user.isSuperAdmin is not a function`

- [ ] **Step 3: Atualizar `status.ts` — adicionar `LOCKED` e `LockedStatus`**

Arquivo: `apps/backend/src/user/domain/value-object/status.ts`

```typescript
import type { User } from "../user"

export const StatusTypes = {
  ACTIVATED: "activated",
  SUSPENDED: "suspended",
  LOCKED: "locked",
} as const

export type StatusTypes = (typeof StatusTypes)[keyof typeof StatusTypes]

export abstract class UserStatus {
  abstract readonly type: StatusTypes
  constructor(protected readonly user: User) {}

  abstract activate(): void
  abstract suspend(): void
  abstract lock(): void
}

class ActivatedStatus extends UserStatus {
  readonly type: StatusTypes = "activated"

  public activate(): void {
    return
  }

  public suspend(): void {
    const userStatus = UserStatusFactory.create(this.user, "suspended")
    this.user._changeStatus(userStatus)
  }

  public lock(): void {
    const userStatus = UserStatusFactory.create(this.user, "locked")
    this.user._changeStatus(userStatus)
  }
}

class SuspendedStatus extends UserStatus {
  readonly type: StatusTypes = "suspended"

  public activate(): void {
    const userStatus = UserStatusFactory.create(this.user, "activated")
    this.user._changeStatus(userStatus)
  }

  public suspend(): void {
    return
  }

  public lock(): void {
    return // suspended tem precedência; no-op
  }
}

class LockedStatus extends UserStatus {
  readonly type: StatusTypes = "locked"

  public activate(): void {
    const userStatus = UserStatusFactory.create(this.user, "activated")
    this.user._changeStatus(userStatus)
  }

  public suspend(): void {
    const userStatus = UserStatusFactory.create(this.user, "suspended")
    this.user._changeStatus(userStatus)
  }

  public lock(): void {
    return // já bloqueado; no-op
  }
}

export class UserStatusFactory {
  static create(user: User, statusType: StatusTypes): UserStatus {
    switch (statusType) {
      case "activated":
        return new ActivatedStatus(user)
      case "suspended":
        return new SuspendedStatus(user)
      case "locked":
        return new LockedStatus(user)
      default:
        return new ActivatedStatus(user)
    }
  }
}
```

- [ ] **Step 4: Atualizar `user.ts` — adicionar `isSuperAdmin`, `lock()`, `isLocked`**

Arquivo: `apps/backend/src/user/domain/user.ts`

**4a. Atualizar `UserConstructor` interface** (adicionar `isSuperAdmin`):

```typescript
export interface UserConstructor {
  id: Id
  name: Name
  email: Email
  password?: Password
  googleId?: GoogleId
  role: Role
  createdAt: Date
  updatedAt?: Date
  status: StatusTypes
  billingCustomerId?: string
  isSuperAdmin?: boolean
}
```

**4b. Atualizar `UserRestore` interface** (adicionar `isSuperAdmin`):

```typescript
export interface UserRestore {
  id: string
  name: string
  email: string
  password?: string
  googleId?: string
  role: RoleTypes
  status: StatusTypes
  createdAt: Date
  updatedAt?: Date
  billingCustomerId?: string
  isSuperAdmin?: boolean
}
```

**4c. Adicionar campo privado na classe `User`**:

```typescript
private _isSuperAdmin: boolean
```

**4d. Inicializar no construtor** (dentro de `private constructor`):

```typescript
this._isSuperAdmin = props.isSuperAdmin ?? false
```

**4e. Passar `isSuperAdmin` no método `restore()`**:

```typescript
public static restore(userRestoreProps: UserRestore): User {
  return new User({
    id: Id.restore(userRestoreProps.id),
    email: Email.restore(userRestoreProps.email),
    name: Name.restore(userRestoreProps.name),
    password: userRestoreProps.password
      ? Password.restore(userRestoreProps.password)
      : undefined,
    googleId: userRestoreProps.googleId
      ? GoogleId.restore(userRestoreProps.googleId)
      : undefined,
    role: Role.restore(userRestoreProps.role),
    createdAt: userRestoreProps.createdAt,
    updatedAt: userRestoreProps.updatedAt,
    status: userRestoreProps.status,
    billingCustomerId: userRestoreProps.billingCustomerId,
    isSuperAdmin: userRestoreProps.isSuperAdmin ?? false,
  })
}
```

**4f. Adicionar getter, método `lock()` e getter `isLocked`** (após os getters existentes):

```typescript
get isSuperAdmin(): boolean {
  return this._isSuperAdmin
}

public lock(): void {
  this._status.lock()
}

public get isLocked(): boolean {
  return this._status.type === StatusTypes.LOCKED
}
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "User — status locked e isSuperAdmin"
```

Esperado: PASS — todos os 7 testes passam.

- [ ] **Step 6: Rodar suite completa para verificar regressões**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/user/domain/
git commit -m "feat(login-security-lockout): adicionar LockedStatus, isSuperAdmin e método lock() na entidade User"
```

## Critérios de Sucesso

- `StatusTypes.LOCKED === "locked"` existe
- `User.lock()` transiciona `activated → locked`; `User.activate()` transiciona `locked → activated`; `User.suspend()` transiciona `locked → suspended`
- `User.isSuperAdmin` retorna `true` quando restaurado com `isSuperAdmin: true`, `false` por padrão
- `pnpm --filter backend test:run` passa sem regressões [RF-002, RF-005, RF-016, RF-020]
