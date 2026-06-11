# Task 2: Entidade `User` — campo `deletedAt`, método `delete()`, getter `isDeleted` [RF-001, RF-002]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** N/A

## Visão Geral

Adiciona a dimensão de soft delete à entidade de domínio `User`: um campo privado `_deletedAt?: Date`, o método de mutação `delete()` que marca o momento da exclusão, e os getters `deletedAt` e `isDeleted`. A entidade `User` **não possui** `toPrimitive()` — a persistência é feita via getters; portanto basta expor `deletedAt`.

O soft delete é **ortogonal ao status** (`activated`/`suspended`/`locked`) — NÃO crie um novo `DeletedStatus` nem um valor de status `deleted`. O State pattern de status permanece intacto (decisão #4 do spec).

## Arquivos

- Modify: `apps/backend/src/user/domain/user.ts`
- Test: `apps/backend/src/user/domain/user.test.ts` (criar se não existir; caso já exista, adicionar o describe abaixo)

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: teste comportamento real da entidade (estado após `delete()`), sem mocks de produção.
- use skill `no-workarounds`: marque a exclusão com `new Date()` real; não use sentinelas nem flags booleanas paralelas a um timestamp.

## Passos

- **Step 1: Escrever o teste que falha**

Crie/edite `apps/backend/src/user/domain/user.test.ts` adicionando:

```typescript
import { User } from "./user"

describe("User soft delete", () => {
  test("Deve iniciar não-excluído (isDeleted=false, deletedAt=undefined)", async () => {
    const user = (
      await User.create({
        email: "user@email.com",
        name: "any_name",
        password: "any_password",
      })
    ).forceSuccess().value
    expect(user.isDeleted).toBe(false)
    expect(user.deletedAt).toBeUndefined()
  })

  test("Deve marcar o usuário como excluído ao chamar delete()", async () => {
    const user = (
      await User.create({
        email: "user@email.com",
        name: "any_name",
        password: "any_password",
      })
    ).forceSuccess().value
    user.delete()
    expect(user.isDeleted).toBe(true)
    expect(user.deletedAt).toBeInstanceOf(Date)
  })

  test("Deve preservar deletedAt ao restaurar um usuário excluído", () => {
    const deletedAt = new Date("2026-01-01T00:00:00.000Z")
    const user = User.restore({
      id: "user-id",
      email: "user@email.com",
      name: "any_name",
      role: "MEMBER",
      status: "activated",
      createdAt: new Date(),
      deletedAt,
    })
    expect(user.isDeleted).toBe(true)
    expect(user.deletedAt).toEqual(deletedAt)
  })
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "User soft delete"`
Expected: FAIL — `user.delete is not a function` / `Property 'isDeleted' does not exist` / `deletedAt` não aceito em `restore`.

- **Step 3: Adicionar o campo ao `UserConstructor` e ao `UserRestore`**

Em `apps/backend/src/user/domain/user.ts`, adicione `deletedAt?: Date` à interface `UserConstructor` (após `isSuperAdmin`):

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
  deletedAt?: Date
}
```

E à interface `UserRestore` (após `isSuperAdmin`):

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
  deletedAt?: Date
}
```

- **Step 4: Adicionar o campo privado e inicializá-lo no construtor**

Adicione a declaração do campo (após `private _isSuperAdmin: boolean`):

```typescript
  private _isSuperAdmin: boolean
  private _deletedAt?: Date
```

E no `private constructor(props: UserConstructor)`, após `this._isSuperAdmin = props.isSuperAdmin ?? false`:

```typescript
    this._isSuperAdmin = props.isSuperAdmin ?? false
    this._deletedAt = props.deletedAt
```

- **Step 5: Repassar `deletedAt` no `restore()`**

No método `public static restore(...)`, dentro do `new User({...})`, adicione após `isSuperAdmin: userRestoreProps.isSuperAdmin ?? false,`:

```typescript
      isSuperAdmin: userRestoreProps.isSuperAdmin ?? false,
      deletedAt: userRestoreProps.deletedAt,
```

- **Step 6: Adicionar getters e o método `delete()`**

Após o getter `get isSuperAdmin()` (e antes de `assignBillingCustomerId`), adicione:

```typescript
  get deletedAt(): Date | undefined {
    return this._deletedAt
  }

  get isDeleted(): boolean {
    return this._deletedAt != null
  }

  public delete(): void {
    this._deletedAt = new Date()
    this.refreshUpdatedAt()
  }
```

- **Step 7: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "User soft delete"`
Expected: PASS (3 testes verdes).

- **Step 8: Validar lint e tipos**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check`
Expected: zero problemas.

- **Step 9: Commit**

```bash
git add apps/backend/src/user/domain/user.ts apps/backend/src/user/domain/user.test.ts
git commit -m "feat(backend): add soft delete (deletedAt) to User entity"
```

## Critérios de Sucesso

- `User` expõe `delete()`, `deletedAt` e `isDeleted` (RF-002).
- `delete()` marca `_deletedAt = new Date()` e atualiza `updatedAt`.
- `restore()` repassa `deletedAt`, preservando o estado de exclusão ao carregar do banco (RF-001).
- Nenhum `DeletedStatus`/valor de status novo foi criado — status permanece `activated`/`suspended`/`locked`.
- `test:run -t "User soft delete"`, `biome:fix` e `tsc:check` passam.
