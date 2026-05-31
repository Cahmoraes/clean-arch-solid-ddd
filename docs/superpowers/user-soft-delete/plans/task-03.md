# Task 3: Repositórios — soft delete + filtro de leitura `deleted_at = null` [RF-003, RF-006]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-01, task-02

## Visão Geral

Implementa o filtro transversal de leitura em todas as três implementações de `UserRepository` (Prisma, InMemory, SQLite): `userOfId`, `userOfEmail`, `userOfGoogleId` e `get` passam a ignorar usuários com `deleted_at` preenchido. Isso faz com que login, perfil e mutações administrativas (que buscam o usuário via essas leituras) ignorem soft-deleted automaticamente (RF-003).

Além disso, o `update()` passa a persistir `deleted_at` (necessário para que `user.delete()` + `update(user)` efetive o soft delete na task-05). O método físico `delete()` é mantido (uso administrativo futuro), mas o fluxo de exclusão lógico usa `update`.

## Arquivos

- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts` (criar)

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: teste o filtro via comportamento real do repositório InMemory, sem mocks.
- use skill `no-workarounds`: o filtro deve ser parte da query/predicado de leitura, não um pós-filtro frágil; sem casts para silenciar tipos do Prisma.

## Passos

- **Step 1: Escrever o teste que falha (InMemory)**

Crie `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts`:

```typescript
import { User } from "@/user/domain/user"
import { UserQuery } from "@/user/application/persistence/repository/user-query"
import { InMemoryUserRepository } from "./in-memory-user-repository"

describe("InMemoryUserRepository soft delete filter", () => {
  let repository: InMemoryUserRepository

  beforeEach(() => {
    repository = new InMemoryUserRepository()
  })

  async function saveDeletedUser(id: string, email: string): Promise<void> {
    const user = (
      await User.create({ id, email, name: "any_name", password: "12345678" })
    ).forceSuccess().value
    user.delete()
    await repository.save(user)
  }

  test("userOfId não retorna usuário soft-deleted", async () => {
    await saveDeletedUser("user-1", "a@mail.com")
    expect(await repository.userOfId("user-1")).toBeNull()
  })

  test("userOfEmail não retorna usuário soft-deleted", async () => {
    await saveDeletedUser("user-2", "b@mail.com")
    expect(await repository.userOfEmail("b@mail.com")).toBeNull()
  })

  test("get não retorna usuário soft-deleted", async () => {
    await saveDeletedUser("user-3", "c@mail.com")
    const query = UserQuery.from({ email: "c@mail.com" }).addField("email")
    expect(await repository.get(query)).toBeNull()
  })

  test("update persiste o soft delete e o usuário some das leituras", async () => {
    const user = (
      await User.create({
        id: "user-4",
        email: "d@mail.com",
        name: "any_name",
        password: "12345678",
      })
    ).forceSuccess().value
    await repository.save(user)
    expect(await repository.userOfId("user-4")).not.toBeNull()
    user.delete()
    await repository.update(user)
    expect(await repository.userOfId("user-4")).toBeNull()
  })
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "InMemoryUserRepository soft delete filter"`
Expected: FAIL — as leituras ainda retornam o usuário excluído.

- **Step 3: Aplicar o filtro no InMemory**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`, ajuste as leituras para ignorar `isDeleted`:

```typescript
  public async get(objectQuery: UserQuery): Promise<User | null> {
    const fields = objectQuery.fields
    return this.users.find((user) => {
      if (user.isDeleted) return false
      return Object.keys(fields).every((field) => {
        return (user as any)[field] === (fields as any)[field]
      })
    })
  }

  public async userOfEmail(email: string): Promise<User | null> {
    return this.users.find((user) => !user.isDeleted && user.email === email)
  }

  public async userOfGoogleId(googleId: string): Promise<User | null> {
    return this.users.find(
      (user) => !user.isDeleted && user.googleId === googleId,
    )
  }

  public async userOfId(id: string): Promise<User | null> {
    return this.users.find((user) => !user.isDeleted && user.id === id)
  }
```

> Observação: `update()` do InMemory já remove e re-adiciona a entidade; como a entidade carrega `deletedAt`, o filtro acima passa a escondê-la automaticamente. `save()` já preserva `isSuperAdmin` via `User.restore` — adicione `deletedAt: user.deletedAt` ao objeto passado para `User.restore` em `save()`:

```typescript
  public async save(user: User): Promise<void> {
    const userWithId = User.restore({
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      googleId: user.googleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: user.role,
      status: user.status,
      billingCustomerId: user.billingCustomerId,
      isSuperAdmin: user.isSuperAdmin,
      deletedAt: user.deletedAt,
    })
    this.users.add(userWithId)
  }
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "InMemoryUserRepository soft delete filter"`
Expected: PASS (4 testes verdes).

- **Step 5: Aplicar o filtro e a persistência no Prisma**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`:

Em `get`, adicione `deleted_at: null` ao `where`:

```typescript
  public async get(userQuery: UserQuery): Promise<User | null> {
    const userDataOrNull = await this.prisma.user.findFirst({
      where: { ...userQuery.fields, deleted_at: null },
    })
    if (!userDataOrNull) return null
    return this.restoreUser(userDataOrNull)
  }
```

`userOfId`, `userOfEmail`, `userOfGoogleId` usam `findUnique`, que não aceita filtros não-únicos. Troque-os para `findFirst` com o filtro de exclusão:

```typescript
  public async userOfId(id: string): Promise<User | null> {
    const userDataOrNull = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
    })
    if (!userDataOrNull) return null
    return this.restoreUser(userDataOrNull)
  }

  public async userOfEmail(email: string): Promise<User | null> {
    const userDataOrNull = await this.prisma.user.findFirst({
      where: { email, deleted_at: null },
    })
    if (!userDataOrNull) return null
    return this.restoreUser(userDataOrNull)
  }

  public async userOfGoogleId(googleId: string): Promise<User | null> {
    const userDataOrNull = await this.prisma.user.findFirst({
      where: { google_id: googleId, deleted_at: null },
    })
    if (!userDataOrNull) return null
    return this.restoreUser(userDataOrNull)
  }
```

Em `restoreUser`, repasse `deletedAt`:

```typescript
  private async restoreUser(userData: UserData): Promise<User> {
    return User.restore({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      password: userData.password_hash ?? undefined,
      googleId: userData.google_id ?? undefined,
      createdAt: new Date(userData.created_at),
      updatedAt: new Date(userData.updated_at),
      role: userData.role,
      status: userData.status,
      billingCustomerId: userData.billing_customer_id ?? undefined,
      deletedAt: userData.deleted_at ?? undefined,
    })
  }
```

Adicione `deleted_at` à interface local `UserData` (topo do arquivo):

```typescript
interface UserData {
  id: string
  name: string
  email: string
  password_hash: string | null
  google_id: string | null
  created_at: Date
  updated_at: Date
  role: RoleTypes
  status: StatusTypes
  billing_customer_id?: string | null
  deleted_at?: Date | null
}
```

Em `update`, persista `deleted_at`:

```typescript
  public async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        name: user.name,
        password_hash: user.password,
        google_id: user.googleId,
        created_at: user.createdAt,
        role: user.role,
        status: user.status,
        billing_customer_id: user.billingCustomerId,
        is_super_admin: user.isSuperAdmin,
        deleted_at: user.deletedAt ?? null,
        updated_at: user.updatedAt ? user.updatedAt : new Date(),
      },
    })
  }
```

- **Step 6: Aplicar o filtro e a persistência no SQLite**

Em `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts`:

Acrescente `AND "deleted_at" IS NULL` às queries de leitura `userOfId`, `userOfEmail`, `userOfGoogleId`:

```typescript
  public async userOfEmail(email: string): Promise<User | null> {
    const userDataOrNull = this.sqliteConnection
      .query(/*SQL*/ `
      SELECT * FROM "users" WHERE "email" = ? AND "deleted_at" IS NULL
    `)
      .get(email)
    if (!userDataOrNull) return null
    this.assertUserData(userDataOrNull)
    return this.restoreUser(userDataOrNull)
  }

  public async userOfGoogleId(googleId: string): Promise<User | null> {
    const userDataOrNull = this.sqliteConnection
      .query(/*SQL*/ `
      SELECT * FROM "users" WHERE "google_id" = ? AND "deleted_at" IS NULL
    `)
      .get(googleId)
    if (!userDataOrNull) return null
    this.assertUserData(userDataOrNull)
    return this.restoreUser(userDataOrNull)
  }

  public async userOfId(id: string): Promise<User | null> {
    const userDataOrNull = this.sqliteConnection
      .query(/*SQL*/ `
        SELECT * FROM "users" WHERE "id" = ? AND "deleted_at" IS NULL
      `)
      .get(id)
    if (!userDataOrNull) return null
    this.assertUserData(userDataOrNull)
    return this.restoreUser(userDataOrNull)
  }
```

Em `get`, o filtro vem da `UserQuery.sql`; acrescente a cláusula fixa:

```typescript
  public async get(userQuery: UserQuery): Promise<User | null> {
    const userDataOrNull = this.sqliteConnection
      .query(/*SQL*/ `
        SELECT * FROM "users" WHERE ${userQuery.sql} AND "deleted_at" IS NULL
      `)
      .get(...userQuery.values)
    if (!userDataOrNull) return null
    this.assertUserData(userDataOrNull)
    return this.restoreUser(userDataOrNull)
  }
```

Adicione `deleted_at` à interface local `UserData` e repasse em `restoreUser`:

```typescript
interface UserData {
  id: string
  name: string
  email: string
  password_hash: string | null
  google_id: string | null
  created_at: Date
  updated_at: Date
  role: RoleTypes
  status: StatusTypes
  billingCustomerId?: string
  is_super_admin?: boolean | number | null
  deleted_at?: string | null
}
```

```typescript
  private async restoreUser(userData: UserData): Promise<User> {
    return User.restore({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      password: userData.password_hash ?? undefined,
      googleId: userData.google_id ?? undefined,
      createdAt: new Date(userData.created_at),
      updatedAt: userData.updated_at
        ? new Date(userData.updated_at)
        : undefined,
      role: userData.role,
      status: userData.status,
      billingCustomerId: userData.billingCustomerId,
      isSuperAdmin: Boolean(userData.is_super_admin ?? false),
      deletedAt: userData.deleted_at ? new Date(userData.deleted_at) : undefined,
    })
  }
```

Em `save` e `update`, persista `deleted_at`. No `INSERT` adicione a coluna `"deleted_at"` e o valor `user.deletedAt?.toISOString() ?? null`; no `UPDATE` adicione `"deleted_at" = ?` com o mesmo valor:

```typescript
  public async update(user: User): Promise<void> {
    this.sqliteConnection
      .query(/*SQL*/ `
      UPDATE "users"
      SET
        "email" = ?, "name" = ?, "password_hash" = ?, "google_id" = ?,
        "created_at" = ?, "role" = ?, "status" = ?, "billing_customer_id" = ?,
        "is_super_admin" = ?, "deleted_at" = ?, "updated_at" = ?
      WHERE "id" = ?
    `)
      .run(
        user.email,
        user.name,
        user.password ?? null,
        user.googleId ?? null,
        user.createdAt.toISOString(),
        user.role,
        user.status,
        user.billingCustomerId ?? null,
        user.isSuperAdmin ? 1 : 0,
        user.deletedAt ? user.deletedAt.toISOString() : null,
        user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
        user.id,
      )
  }
```

> Para o `save()` do SQLite, acrescente `"deleted_at"` ao `INSERT INTO "users" (...)` e `?` correspondente em `VALUES`, passando `user.deletedAt ? user.deletedAt.toISOString() : null` como último argumento de `.run(...)`.

- **Step 7: Validar lint, tipos e a suíte completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: zero problemas; toda a suíte de unidade passa.

- **Step 8: Commit**

```bash
git add apps/backend/src/shared/infra/database/repository/
git commit -m "feat(backend): filter soft-deleted users in repository reads and persist deleted_at"
```

## Critérios de Sucesso

- `userOfId`/`userOfEmail`/`userOfGoogleId`/`get` ignoram usuários soft-deleted nas três implementações (RF-003).
- `update()` persiste `deleted_at` em Prisma, SQLite e InMemory.
- Nenhum dado físico é apagado (RF-006).
- Teste do InMemory repository passa; `biome:fix`, `tsc:check` e `test:run` passam.
