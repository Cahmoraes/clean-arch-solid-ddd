# Task 4: DAOs — excluir soft-deleted de listagem e estatísticas [RF-004, RF-005]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-01

## Visão Geral

Os DAOs analíticos (`PrismaUserDAO` e `UserDAOMemory`) leem a tabela diretamente, fora do `UserRepository`, então não herdam o filtro da task-03. Esta task adiciona o filtro `deleted_at = null` ao `fetchAndCountUsers` (listagem paginada, RF-004) e exclui soft-deleted de **todas** as contagens de `countUserStats` (total/members/admins/active/inactive, RF-005).

## Arquivos

- Modify: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- Test: `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.test.ts` (criar)

### Conformidade com as Skills Padrão

- use skill `test-antipatterns`: teste o filtro pelo comportamento do DAO InMemory (contagens e listagem), sem mocks.
- use skill `no-workarounds`: o filtro deve estar na query/where (Prisma) e no predicado (InMemory), não em pós-processamento.

## Passos

- **Step 1: Escrever o teste que falha (InMemory DAO)**

Crie `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.test.ts`:

```typescript
import { UserDAOMemory } from "./user-dao-memory"

describe("UserDAOMemory soft delete filter", () => {
  let dao: UserDAOMemory

  beforeEach(() => {
    dao = new UserDAOMemory()
  })

  test("fetchAndCountUsers ignora usuários soft-deleted", async () => {
    dao.createFakeUser({ id: "active-1", status: "activated" })
    dao.createFakeUser({ id: "deleted-1", deletedAt: "2026-01-01T00:00:00.000Z" })

    const result = await dao.fetchAndCountUsers({ page: 1, limit: 10 })

    expect(result.total).toBe(1)
    expect(result.usersData.map((u) => u.id)).toEqual(["active-1"])
  })

  test("countUserStats não contabiliza usuários soft-deleted", async () => {
    dao.createFakeUser({ id: "a", role: "MEMBER", status: "activated" })
    dao.createFakeUser({ id: "b", role: "ADMIN", status: "activated" })
    dao.createFakeUser({
      id: "c",
      role: "MEMBER",
      status: "activated",
      deletedAt: "2026-01-01T00:00:00.000Z",
    })

    const stats = await dao.countUserStats()

    expect(stats.total).toBe(2)
    expect(stats.members).toBe(1)
    expect(stats.admins).toBe(1)
    expect(stats.active).toBe(2)
  })
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "UserDAOMemory soft delete filter"`
Expected: FAIL — `deletedAt` não é aceito em `createFakeUser` e as contagens incluem o excluído.

- **Step 3: Suportar `deletedAt` no InMemory DAO**

Em `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`, adicione `deletedAt` ao `CreateUserInput`:

```typescript
export interface CreateUserInput {
  id?: string
  email?: string
  name?: string
  role?: RoleTypes
  status?: StatusTypes
  createdAt?: string
  deletedAt?: string | null
}
```

No `createFakeUser`, garanta o default `deletedAt: null` no objeto criado (antes do spread de `createUserInput`):

```typescript
  public createFakeUser(createUserInput?: CreateUserInput): FetchUsersData {
    const randomSuffix = createRandomSuffix()
    const fakeUser = {
      id: randomUUID(),
      role: pickRandomItem(USER_ROLES),
      status: pickRandomItem(USER_STATUSES),
      createdAt: new Date().toISOString(),
      name: `User ${randomSuffix}`,
      email: `user_${randomSuffix}@test.com`,
      deletedAt: null,
      ...createUserInput,
    }
    this.usersData.add(fakeUser)
    return fakeUser
  }
```

> `FetchUsersData` (interface de saída do DAO) não inclui `deletedAt` — o `createFakeUser` retorna `FetchUsersData`, então o `deletedAt` é apenas um campo interno de `usersData`. Como `usersData` é `ExtendedSet<Required<CreateUserInput>>`, o campo passa a existir no item interno. Mantenha o `return fakeUser` (o excesso de campos é compatível estruturalmente com `FetchUsersData`).

No `fetchAndCountUsers`, filtre soft-deleted no início:

```typescript
  public async fetchAndCountUsers(
    input: FetchUsersInput,
  ): Promise<FetchUsersOutput> {
    const allUsers = this.usersData
      .toArray()
      .filter((u) => u.deletedAt == null)
    let filtered = input.query
      ? allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(input.query?.toLowerCase() ?? "") ||
            u.email.toLowerCase().includes(input.query?.toLowerCase() ?? ""),
        )
      : allUsers
    // ... restante inalterado (role, status, slice) ...
```

No `countUserStats`, filtre antes de contar:

```typescript
  public async countUserStats(): Promise<UserStatsOutput> {
    const all = this.usersData.toArray().filter((u) => u.deletedAt == null)
    return {
      total: all.length,
      members: all.filter((u) => u.role === "MEMBER").length,
      admins: all.filter((u) => u.role === "ADMIN").length,
      active: all.filter((u) => u.status === UserStatusTypes.ACTIVATED).length,
      inactive: all.filter((u) => u.status === UserStatusTypes.SUSPENDED).length,
    }
  }
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "UserDAOMemory soft delete filter"`
Expected: PASS (2 testes verdes).

- **Step 5: Aplicar o filtro no Prisma DAO**

Em `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`:

No `buildWhereClause`, adicione `deleted_at: null` como filtro fixo:

```typescript
  private buildWhereClause(input: FetchUsersInput) {
    const statusValue = this.resolveStatusValue(input.status)
    return {
      deleted_at: null,
      ...(input.query && {
        OR: [
          { name: { contains: input.query, mode: "insensitive" as const } },
          { email: { contains: input.query, mode: "insensitive" as const } },
        ],
      }),
      ...(input.role && { role: input.role }),
      ...(statusValue && { status: statusValue }),
    }
  }
```

No `countUserStats`, adicione `deleted_at: null` a **todas** as contagens:

```typescript
  public async countUserStats(): Promise<UserStatsOutput> {
    const [total, members, admins, active, inactive] = await Promise.all([
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.count({ where: { deleted_at: null, role: "MEMBER" } }),
      this.prisma.user.count({ where: { deleted_at: null, role: "ADMIN" } }),
      this.prisma.user.count({
        where: { deleted_at: null, status: $Enums.UserStatus.activated },
      }),
      this.prisma.user.count({
        where: { deleted_at: null, status: $Enums.UserStatus.suspended },
      }),
    ])
    return { total, members, admins, active, inactive }
  }
```

- **Step 6: Validar lint, tipos e a suíte completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: zero problemas; toda a suíte de unidade passa.

- **Step 7: Commit**

```bash
git add apps/backend/src/shared/infra/database/dao/
git commit -m "feat(backend): exclude soft-deleted users from DAO listing and stats"
```

## Critérios de Sucesso

- `fetchAndCountUsers` exclui soft-deleted da contagem e dos resultados (RF-004).
- `countUserStats` exclui soft-deleted de total/members/admins/active/inactive (RF-005).
- Testes do DAO InMemory passam; `biome:fix`, `tsc:check` e `test:run` passam.
