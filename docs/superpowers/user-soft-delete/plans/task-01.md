# Task 1: Schema Prisma + migração `deleted_at` [RF-001, RF-006]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** N/A

## Visão Geral

Adiciona a coluna `deleted_at DateTime?` ao model `User` do Prisma, seguindo a convenção já usada em `UserNotification` (`deletedAt DateTime? @map("deleted_at")`). Gera e aplica a migração, e regenera o Prisma Client para que o campo fique disponível nos repositórios e DAOs.

A coluna é nullable: `null` = usuário ativo; data preenchida = usuário soft-deleted. Nenhum dado é apagado fisicamente (RF-006).

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma` (model `User`)
- Create: `apps/backend/prisma/migrations/<timestamp>_add_user_deleted_at/migration.sql` (gerada pelo Prisma)

### Conformidade com as Skills Padrão

- use skill `no-workarounds`: não use defaults artificiais nem mascare erros de migração; a coluna deve ser genuinamente nullable.
- use skill `context7`: se necessário, confira a sintaxe atual de `prisma migrate dev --create-only` antes de rodar.

## Passos

- **Step 1: Garantir Postgres ativo**

Run: `pnpm --filter backend docker:up`
Expected: containers `postgres`, `redis`, `rabbitmq` em estado `Up` (ou já em execução).

- **Step 2: Adicionar a coluna ao model `User`**

Em `apps/backend/prisma/schema.prisma`, no model `User`, adicione a linha `deleted_at` logo após `is_super_admin`:

```prisma
model User {
  id                  String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                String
  email               String             @unique
  password_hash       String?
  google_id           String?            @unique
  created_at          DateTime           @default(now())
  role                Role               @default(MEMBER)
  updated_at          DateTime           @updatedAt
  status              UserStatus         @default(activated)
  billing_customer_id String?            @unique
  is_super_admin      Boolean            @default(false)
  deleted_at          DateTime?          @map("deleted_at")

  checkIns          CheckIn[]
  subscription      Subscription[]
  userNotifications UserNotification[]

  @@map("users")
}
```

- **Step 3: Criar a migração sem aplicar (revisar SQL primeiro)**

Run: `pnpm --filter backend prisma:migrate:dev -- --create-only --name add_user_deleted_at`
Expected: cria `apps/backend/prisma/migrations/<timestamp>_add_user_deleted_at/migration.sql`.

- **Step 4: Conferir o SQL gerado**

Abra o `migration.sql` gerado. Deve conter exatamente:

```sql
-- AlterTable
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
```

Expected: nenhuma cláusula `NOT NULL`, nenhum `DEFAULT`. A coluna é opcional.

- **Step 5: Aplicar a migração**

Run: `pnpm --filter backend prisma:migrate:dev`
Expected: `The following migration(s) have been applied` e o Prisma Client é regenerado automaticamente.

- **Step 6: Regenerar o Prisma Client (garantia)**

Run: `pnpm --filter backend prisma:generate`
Expected: `Generated Prisma Client`. O tipo gerado de `User` agora inclui `deleted_at: Date | null`.

- **Step 7: Validar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: passa sem erros (o schema novo não quebra nada ainda, pois os repos só serão alterados na task-03).

- **Step 8: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(backend): add deleted_at column to User for soft delete"
```

## Critérios de Sucesso

- A coluna `deleted_at` existe no model `User` como `DateTime?` mapeada para `deleted_at` (RF-001).
- A migração contém apenas `ADD COLUMN "deleted_at" TIMESTAMP(3)` sem `NOT NULL`/`DEFAULT` — nenhum dado físico é alterado (RF-006).
- `prisma:generate` expõe `deleted_at: Date | null` no tipo do cliente.
- `tsc:check` passa.
