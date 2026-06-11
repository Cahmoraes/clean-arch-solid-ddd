# Task 9: PrismaNotificationRepository [RF-024, RF-025, RF-026, RF-027]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-03, task-08

## Visão Geral

Implementar `PrismaNotificationRepository` usando o Prisma client gerado na task-08. A entidade de domínio `Notification` não mapeia diretamente para um único model — ela é composta de `Notification` (dados compartilhados) + `UserNotification` (dados por usuário: `readAt`, `deletedAt`). O repositório oculta essa complexidade. Também criar o `NotificationRepositoryProvider` (mesma convenção dos outros bounded contexts).

## Arquivos

- Create: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts`
- Create: `apps/backend/src/notification/infra/repository/notification-repository-provider.ts`

### Conformidade com as Skills Padrão

- code-style: `@injectable()`, `@inject(SHARED_TYPES.Prisma.Client)`, método `withTransaction` (pode lançar `InvalidTransactionInstance`), mapear snake_case → camelCase

## Passos

### Passo 1: Implementar `PrismaNotificationRepository`

Arquivo: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts`

```ts
import { inject, injectable } from "inversify"

import type {
  FindManyNotificationsInput,
  FindManyNotificationsOutput,
  NotificationRepository,
  SaveNotificationResponse,
} from "@/notification/application/repository/notification.repository.js"
import {
  Notification,
  type NotificationType,
} from "@/notification/domain/notification.js"
import {
  Prisma,
  type PrismaClient,
} from "@/shared/infra/database/generated/prisma/client/index.js"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work.js"
import { env } from "@/shared/infra/env/index.js"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(
    @inject(SHARED_TYPES.Prisma.Client)
    private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
  ) {}

  public withTransaction<TX extends object>(
    prismaClient: TX,
  ): NotificationRepository {
    if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
      return new PrismaNotificationRepository(prismaClient)
    }
    throw new InvalidTransactionInstance(prismaClient)
  }

  public async save(
    notification: Notification,
  ): Promise<SaveNotificationResponse> {
    await this.prismaClient.notification.upsert({
      where: { id: notification.id },
      create: {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        gym_name: notification.gymName ?? null,
        reason: notification.reason ?? null,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        userNotifications: {
          create: {
            userId: notification.userId,
            readAt: notification.readAt ?? null,
            deletedAt: notification.deletedAt ?? null,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt,
          },
        },
      },
      update: {
        updatedAt: notification.updatedAt,
        userNotifications: {
          updateMany: {
            where: { userId: notification.userId },
            data: {
              readAt: notification.readAt ?? null,
              deletedAt: notification.deletedAt ?? null,
              updatedAt: notification.updatedAt,
            },
          },
        },
      },
    })
    return { id: notification.id }
  }

  public async findById(id: string): Promise<Notification | null> {
    const data = await this.prismaClient.notification.findUnique({
      where: { id },
      include: { userNotifications: { take: 1 } },
    })
    if (!data) return null
    return this.toDomain(data)
  }

  public async findManyByUserId(
    input: FindManyNotificationsInput,
  ): Promise<FindManyNotificationsOutput> {
    const where = this.buildWhere(input)

    const [rows, total] = await Promise.all([
      this.prismaClient.notification.findMany({
        where,
        include: {
          userNotifications: {
            where: { userId: input.userId },
            take: 1,
          },
        },
        skip: (input.page - 1) * env.ITEMS_PER_PAGE,
        take: env.ITEMS_PER_PAGE,
        orderBy: { createdAt: "desc" },
      }),
      this.prismaClient.notification.count({ where }),
    ])

    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
    }
  }

  private buildWhere(
    input: FindManyNotificationsInput,
  ): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = {
      userNotifications: {
        some: {
          userId: input.userId,
          deletedAt: null,
          ...(input.onlyUnread ? { readAt: null } : {}),
        },
      },
    }
    return where
  }

  public async countUnreadByUserId(userId: string): Promise<number> {
    return this.prismaClient.userNotification.count({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
    })
  }

  public async markAllAsReadByUserId(userId: string): Promise<void> {
    await this.prismaClient.userNotification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  private toDomain(
    row: {
      id: string
      userId: string
      type: NotificationType
      title: string
      message: string
      gym_name: string | null
      reason: string | null
      createdAt: Date
      updatedAt: Date
      userNotifications: Array<{
        readAt: Date | null
        deletedAt: Date | null
      }>
    },
  ): Notification {
    const un = row.userNotifications[0]
    return Notification.restore({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      gymName: row.gym_name ?? undefined,
      reason: row.reason ?? undefined,
      readAt: un?.readAt ?? undefined,
      deletedAt: un?.deletedAt ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  }
}
```

### Passo 2: Criar o `NotificationRepositoryProvider`

Arquivo: `apps/backend/src/notification/infra/repository/notification-repository-provider.ts`

```ts
import type { ResolutionContext } from "inversify"

import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository.js"
import { PrismaNotificationRepository } from "@/notification/infra/repository/prisma/prisma-notification.repository.js"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { isProduction } from "@/shared/infra/env/index.js"

export class NotificationRepositoryProvider {
  public static provide(context: ResolutionContext): NotificationRepository {
    return isProduction()
      ? context.get(PrismaNotificationRepository, { autobind: true })
      : context.get(InMemoryNotificationRepository, { autobind: true })
  }
}
```

### Passo 3: Verificar que o TypeScript compila

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros de compilação.

### Passo 4: Lint

```bash
cd apps/backend
pnpm biome:fix
```

Esperado: zero issues.

### Passo 5: Commit

```bash
git add \
  apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts \
  apps/backend/src/notification/infra/repository/notification-repository-provider.ts
git commit -m "feat(notification): add PrismaNotificationRepository and provider"
```

## Critérios de Sucesso

- `save()` faz upsert em `Notification` + `UserNotification` [RF-024]
- `findManyByUserId()` filtra por userId + deletedAt=null + onlyUnread opcional [RF-025, RF-026]
- `countUnreadByUserId()` conta via `UserNotification` com partial index [RF-027]
- `markAllAsReadByUserId()` usa `updateMany` [RF-024]
- `NotificationRepositoryProvider` seleciona Prisma em prod e InMemory em dev [RF-024]
- `tsc:check` e `biome:fix` passam sem erros
