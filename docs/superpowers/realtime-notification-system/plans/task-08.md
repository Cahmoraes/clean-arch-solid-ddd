# Task 8: Prisma schema + migration [RF-024, RF-027]

**Status:** DONE
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** N/A

## Visão Geral

Adicionar os modelos `Notification` e `UserNotification` ao schema Prisma e criar a migration. Prisma não suporta partial indexes nativamente — a migration SQL será criada manualmente com `--create-only` e editada para adicionar o índice condicional. Após a migration, gerar o client Prisma.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_add_notification_tables/migration.sql` (gerado + editado)

### Conformidade com as Skills Padrão

- Sem código de aplicação nesta task — apenas schema + migration

## Passos

### Passo 1: Adicionar modelos ao `schema.prisma`

Arquivo: `apps/backend/prisma/schema.prisma`

Adicionar ao final do arquivo (antes dos `enum`s):

```prisma
model Notification {
  id        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String
  message   String
  gymName   String?          @map("gym_name")
  reason    String?
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  userNotifications UserNotification[]

  @@index([userId])
  @@map("notifications")
}

model UserNotification {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  notificationId String       @map("notification_id") @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  readAt         DateTime?    @map("read_at")
  deletedAt      DateTime?    @map("deleted_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_notifications")
}

enum NotificationType {
  CHECK_IN_APPROVED
  CHECK_IN_REJECTED
  SECURITY_ALERT
  PROMOTION
}
```

Adicionar também a relação reversa no model `User` (localizar `@@map("users")` e adicionar o campo antes):

```prisma
  userNotifications UserNotification[]
```

### Passo 2: Adicionar relação `userNotifications` ao model User

O model `User` atualmente termina com:
```prisma
  checkIns     CheckIn[]
  subscription Subscription[]

  @@map("users")
```

Alterar para:
```prisma
  checkIns          CheckIn[]
  subscription      Subscription[]
  userNotifications UserNotification[]

  @@map("users")
```

### Passo 3: Criar a migration com `--create-only`

```bash
cd apps/backend
npx prisma migrate dev --name add_notification_tables --create-only
```

Isso gera o arquivo SQL em `prisma/migrations/<timestamp>_add_notification_tables/migration.sql` sem aplicá-la ainda.

### Passo 4: Editar o arquivo de migration para adicionar partial index

Abrir o arquivo `migration.sql` gerado. Ao final, antes do último `-- End`, adicionar o índice parcial para consultas de não-lidas:

```sql
-- Partial index for unread notifications per user
CREATE INDEX "user_notifications_user_id_unread_idx"
  ON "user_notifications" ("user_id")
  WHERE "read_at" IS NULL AND "deleted_at" IS NULL;
```

### Passo 5: Aplicar a migration

```bash
cd apps/backend
npx prisma migrate dev
```

Esperado: migration aplicada com sucesso, tabelas `notifications` e `user_notifications` criadas no banco local.

### Passo 6: Gerar o Prisma client

```bash
cd apps/backend
pnpm prisma:generate
```

Esperado: client gerado em `src/shared/infra/database/generated/prisma`.

### Passo 7: Verificar que o TypeScript compila após geração

```bash
cd apps/backend
pnpm tsc:check
```

Esperado: zero erros (os tipos Prisma gerados estão disponíveis).

### Passo 8: Lint

```bash
cd apps/backend
pnpm biome:fix
```

Esperado: zero issues.

### Passo 9: Commit

```bash
git add \
  apps/backend/prisma/schema.prisma \
  apps/backend/prisma/migrations/
git commit -m "feat(notification): add Prisma schema for notifications and user_notifications"
```

## Critérios de Sucesso

- Modelos `Notification` e `UserNotification` existem no schema com todos os campos [RF-024]
- Relação `User → UserNotification` configurada [RF-027]
- Partial index `WHERE read_at IS NULL AND deleted_at IS NULL` na migration SQL [RF-027]
- `pnpm prisma:generate` completa sem erros
- `tsc:check` e `biome:fix` passam sem erros
