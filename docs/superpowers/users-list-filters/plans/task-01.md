# Task 1: Backend — Estender UserDAO com método de stats e filtros role/status [RF-014, RF-017, RF-018, RF-019, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-users-list-filters.md`
**Spec:** `../specs/users-list-filters-design.md`

## Visão Geral

Estende a interface `UserDAO` com dois novos contratos: (1) método `countUserStats()` que retorna totais por categoria, e (2) parâmetros opcionais `role` e `status` em `FetchUsersInput` para filtragem da listagem. Implementa esses contratos em `UserDAOMemory` (testes) e `PrismaUserDAO` (produção).

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/dao/user-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`

### Conformidade com as Skills Padrão

- no-workarounds: não usar `as any` nem hacks de tipagem
- test-antipatterns: testes com casos reais, sem mocks frágeis

## Passos

- [ ] **Step 1: Estender a interface UserDAO**

Abra `apps/backend/src/user/application/persistence/dao/user-dao.ts` e substitua o conteúdo por:

```typescript
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface FetchUsersInput {
  page: number
  limit: number
  query?: string
  role?: RoleTypes
  status?: "active" | "inactive"
}

export interface FetchUsersData {
  id: string
  role: RoleTypes
  status: StatusTypes
  createdAt: string
  name: string
  email: string
}

export interface FetchUsersOutput {
  usersData: FetchUsersData[]
  total: number
}

export interface UserStatsOutput {
  total: number
  members: number
  admins: number
  active: number
  inactive: number
}

export interface UserDAO {
  fetchAndCountUsers(input: FetchUsersInput): Promise<FetchUsersOutput>
  countUserStats(): Promise<UserStatsOutput>
}
```

- [ ] **Step 2: Implementar em UserDAOMemory**

Abra `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts` e substitua a classe:

```typescript
import { randomUUID } from "node:crypto"
import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
  FetchUsersData,
  FetchUsersInput,
  FetchUsersOutput,
  UserDAO,
  UserStatsOutput,
} from "@/user/application/persistence/dao/user-dao"
import type { RoleTypes } from "@/user/domain/value-object/role"
import {
  type StatusTypes,
  StatusTypes as UserStatusTypes,
} from "@/user/domain/value-object/status"

export interface CreateUserInput {
  id?: string
  email?: string
  name?: string
  role?: RoleTypes
  status?: StatusTypes
  createdAt?: string
}

const USER_ROLES: RoleTypes[] = ["ADMIN", "MEMBER"]
const USER_STATUSES: StatusTypes[] = [
  UserStatusTypes.ACTIVATED,
  UserStatusTypes.SUSPENDED,
]

function pickRandomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function createRandomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

@injectable()
export class UserDAOMemory implements UserDAO {
  public usersData: ExtendedSet<Required<CreateUserInput>>

  constructor() {
    this.usersData = new ExtendedSet()
  }

  public bulkCreateFakeUsers(quantity: number): void {
    for (let i = 0; i < quantity; i++) {
      this.createFakeUser()
    }
  }

  public createFakeUser(createUserInput?: CreateUserInput): FetchUsersData {
    const randomSuffix = createRandomSuffix()
    const fakeUser = {
      id: randomUUID(),
      role: pickRandomItem(USER_ROLES),
      status: pickRandomItem(USER_STATUSES),
      createdAt: new Date().toISOString(),
      name: `User ${randomSuffix}`,
      email: `user_${randomSuffix}@test.com`,
      ...createUserInput,
    }
    this.usersData.add(fakeUser)
    return fakeUser
  }

  public clear(): void {
    this.usersData.clear()
  }

  public async fetchAndCountUsers(
    input: FetchUsersInput,
  ): Promise<FetchUsersOutput> {
    const allUsers = this.usersData.toArray()
    let filtered = input.query
      ? allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(input.query?.toLowerCase() ?? "") ||
            u.email.toLowerCase().includes(input.query?.toLowerCase() ?? ""),
        )
      : allUsers

    if (input.role) {
      filtered = filtered.filter((u) => u.role === input.role)
    }

    if (input.status === "active") {
      filtered = filtered.filter(
        (u) => u.status === UserStatusTypes.ACTIVATED,
      )
    } else if (input.status === "inactive") {
      filtered = filtered.filter(
        (u) => u.status === UserStatusTypes.SUSPENDED,
      )
    }

    const usersData = filtered.slice(
      (input.page - 1) * input.limit,
      input.page * input.limit,
    )
    return {
      usersData,
      total: filtered.length,
    }
  }

  public async countUserStats(): Promise<UserStatsOutput> {
    const all = this.usersData.toArray()
    return {
      total: all.length,
      members: all.filter((u) => u.role === "MEMBER").length,
      admins: all.filter((u) => u.role === "ADMIN").length,
      active: all.filter((u) => u.status === UserStatusTypes.ACTIVATED).length,
      inactive: all.filter((u) => u.status === UserStatusTypes.SUSPENDED)
        .length,
    }
  }
}
```

- [ ] **Step 3: Implementar em PrismaUserDAO**

Abra `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts` e substitua:

```typescript
import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
  FetchUsersInput,
  FetchUsersOutput,
  UserDAO,
  UserStatsOutput,
} from "@/user/application/persistence/dao/user-dao"

@injectable()
export class PrismaUserDAO implements UserDAO {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prisma: PrismaClient,
  ) {}

  public async fetchAndCountUsers(
    input: FetchUsersInput,
  ): Promise<FetchUsersOutput> {
    const statusValue =
      input.status === "active"
        ? "activated"
        : input.status === "inactive"
          ? "suspended"
          : undefined

    const where = {
      ...(input.query && {
        OR: [
          {
            name: {
              contains: input.query,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: input.query,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
      ...(input.role && { role: input.role }),
      ...(statusValue && { status: statusValue }),
    }

    const [usersData, total] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          email: true,
          id: true,
          name: true,
          role: true,
          status: true,
          created_at: true,
        },
        where,
        take: input.limit,
        skip: (input.page - 1) * input.limit,
      }),
      this.prisma.user.count({ where }),
    ])

    return {
      total,
      usersData: usersData.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.created_at.toISOString(),
      })),
    }
  }

  public async countUserStats(): Promise<UserStatsOutput> {
    const [total, members, admins, active, inactive] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: "MEMBER" } }),
      this.prisma.user.count({ where: { role: "ADMIN" } }),
      this.prisma.user.count({ where: { status: "activated" } }),
      this.prisma.user.count({ where: { status: "suspended" } }),
    ])
    return { total, members, admins, active, inactive }
  }
}
```

- [ ] **Step 4: Verificar tipos**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros de tipo.

- [ ] **Step 5: Rodar lint**

```bash
pnpm --filter backend biome:fix
```

Esperado: zero issues.

## Critérios de Sucesso

- `UserDAO` interface contém `countUserStats()` e `FetchUsersInput` tem `role?` e `status?`
- `UserDAOMemory.fetchAndCountUsers()` filtra por role e status
- `UserDAOMemory.countUserStats()` retorna totais corretos
- `PrismaUserDAO.fetchAndCountUsers()` aplica filtros no `where` do Prisma
- `PrismaUserDAO.countUserStats()` usa 5 queries paralelas com `Promise.all`
- `tsc:check` e `biome:fix` passam sem erros
