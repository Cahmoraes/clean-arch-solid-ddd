# Task 3: NotificationRepository interface [RF-024, RF-025, RF-026, RF-027]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-02

## Visão Geral

Definir a interface `NotificationRepository` na camada de Application. Esta interface é o contrato entre use cases e implementações (InMemory / Prisma). Não há lógica — só tipos.

## Arquivos

- Create: `apps/backend/src/notification/application/repository/notification.repository.ts`

### Conformidade com as Skills Padrão

- code-style: interface pura em Application layer, sem imports de infra

## Passos

### Passo 1: Criar a interface

Arquivo: `apps/backend/src/notification/application/repository/notification.repository.ts`

```ts
import type { Notification } from "@/notification/domain/notification.js"

export interface SaveNotificationResponse {
  id: string
}

export interface FindManyNotificationsInput {
  userId: string
  page: number
  onlyUnread?: boolean
}

export interface FindManyNotificationsOutput {
  items: Notification[]
  total: number
}

export interface NotificationRepository {
  save(notification: Notification): Promise<SaveNotificationResponse>
  findById(id: string): Promise<Notification | null>
  findManyByUserId(
    input: FindManyNotificationsInput,
  ): Promise<FindManyNotificationsOutput>
  countUnreadByUserId(userId: string): Promise<number>
  markAllAsReadByUserId(userId: string): Promise<void>
}
```

### Passo 2: Verificar que o TypeScript não reclama

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros de compilação.

### Passo 3: Lint

```bash
cd apps/backend
pnpm biome:fix
```

Esperado: zero issues.

### Passo 4: Commit

```bash
git add apps/backend/src/notification/application/repository/notification.repository.ts
git commit -m "feat(notification): add NotificationRepository interface"
```

## Critérios de Sucesso

- Interface possui `save`, `findById`, `findManyByUserId`, `countUnreadByUserId`, `markAllAsReadByUserId` [RF-024, RF-025, RF-026]
- `FindManyNotificationsInput` suporta `onlyUnread?: boolean` para filtro [RF-026]
- Sem imports de infra na camada de aplicação
- `tsc:check` e `biome:fix` passam sem erros
