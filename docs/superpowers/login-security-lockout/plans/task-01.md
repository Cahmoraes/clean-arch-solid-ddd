# Task 1: Prisma migration — `locked` no enum UserStatus + campo `isSuperAdmin` [RF-018, RF-019]

**Status:** DONE
**PRD:** `../prd/prd-login-security-lockout.md`
**Spec:** `../specs/login-security-lockout-design.md`

## Visão Geral

Adiciona o valor `locked` ao enum `UserStatus` do Prisma, adiciona o campo `is_super_admin Boolean @default(false)` ao model `User`, gera a migration, e aplica a data migration para marcar o root admin como `isSuperAdmin = true`. Também atualiza os repositórios Prisma que mapeiam `User` do banco para a entidade de domínio.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration gerada por `prisma migrate dev` em `apps/backend/prisma/migrations/`
- Modify: `apps/backend/src/shared/infra/database/repository/pg/pg-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts`

### Conformidade com as Skills Padrão

- no-workarounds: nenhum valor de enum temporário; a migration é a mudança correta

## Passos

- [ ] **Step 1: Atualizar `schema.prisma` — enum UserStatus e model User**

Arquivo: `apps/backend/prisma/schema.prisma`

Localizar o enum `UserStatus` e o model `User` e aplicar as seguintes alterações:

```prisma
enum UserStatus {
  activated
  suspended
  locked
}

model User {
  id                  String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name                String
  email               String     @unique
  password_hash       String?
  google_id           String?    @unique
  created_at          DateTime   @default(now())
  role                Role       @default(MEMBER)
  updated_at          DateTime   @updatedAt
  status              UserStatus @default(activated)
  billing_customer_id String?    @unique
  is_super_admin      Boolean    @default(false)

  checkIns     CheckIn[]
  subscription Subscription[]

  @@map("users")
}
```

- [ ] **Step 2: Gerar a migration**

```bash
pnpm --filter backend prisma:migrate:dev -- --name add_locked_status_and_is_super_admin
```

Esperado: migration criada em `prisma/migrations/{timestamp}_add_locked_status_and_is_super_admin/migration.sql`

- [ ] **Step 3: Verificar o SQL gerado e adicionar a data migration**

Abrir o arquivo `migration.sql` gerado. Ele terá algo similar a:

```sql
ALTER TYPE "UserStatus" ADD VALUE 'locked';
ALTER TABLE "users" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;
```

Adicionar ao final do arquivo a data migration para o root admin:

```sql
UPDATE "users" SET "is_super_admin" = true WHERE "email" = 'admin@admin.com';
```

- [ ] **Step 4: Aplicar a migration manualmente (após editar o SQL)**

Como o arquivo SQL foi editado após a geração, re-aplicar via push ou marcar como aplicada:

```bash
pnpm --filter backend prisma:migrate:dev
```

Esperado: migration aplicada com sucesso, sem erros.

- [ ] **Step 5: Atualizar `PgUserRepository` para mapear `isSuperAdmin`**

Arquivo: `apps/backend/src/shared/infra/database/repository/pg/pg-user-repository.ts`

Localizar o método que chama `User.restore()` (ou `userMapper`) e adicionar o campo `isSuperAdmin`:

```typescript
// Antes (dentro do método de mapeamento, ex: toDomain ou mapper):
User.restore({
  id: prismaUser.id,
  name: prismaUser.name,
  email: prismaUser.email,
  password: prismaUser.password_hash ?? undefined,
  googleId: prismaUser.google_id ?? undefined,
  role: prismaUser.role as RoleTypes,
  status: prismaUser.status as StatusTypes,
  createdAt: prismaUser.created_at,
  updatedAt: prismaUser.updated_at ?? undefined,
  billingCustomerId: prismaUser.billing_customer_id ?? undefined,
})

// Depois (adicionar isSuperAdmin):
User.restore({
  id: prismaUser.id,
  name: prismaUser.name,
  email: prismaUser.email,
  password: prismaUser.password_hash ?? undefined,
  googleId: prismaUser.google_id ?? undefined,
  role: prismaUser.role as RoleTypes,
  status: prismaUser.status as StatusTypes,
  createdAt: prismaUser.created_at,
  updatedAt: prismaUser.updated_at ?? undefined,
  billingCustomerId: prismaUser.billing_customer_id ?? undefined,
  isSuperAdmin: prismaUser.isSuperAdmin,
})
```

> **Nota:** Prisma converte snake_case `is_super_admin` para camelCase `isSuperAdmin` automaticamente no cliente gerado.

- [ ] **Step 6: Atualizar `SQLiteUserRepository` da mesma forma**

Arquivo: `apps/backend/src/shared/infra/database/repository/sqlite/sqlite-user-repository.ts`

Aplicar a mesma adição de `isSuperAdmin: prismaUser.isSuperAdmin` no mapeamento de `User.restore()`.

- [ ] **Step 7: Gerar o Prisma client atualizado**

```bash
pnpm --filter backend prisma generate
```

Esperado: client gerado sem erros; `UserStatus` agora inclui `locked`.

- [ ] **Step 8: Verificar que os testes existentes ainda passam**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam. Se algum teste usa o enum `UserStatus` explicitamente e quebra, ajustar para incluir o novo valor.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/prisma/ apps/backend/src/shared/infra/database/repository/
git commit -m "feat(login-security-lockout): adicionar status locked e campo isSuperAdmin ao schema Prisma"
```

## Critérios de Sucesso

- `UserStatus` enum no Prisma inclui `activated | suspended | locked`
- Campo `is_super_admin` existe na tabela `users` com default `false`
- Root admin tem `is_super_admin = true` no banco após a migration
- Prisma client gerado sem erros
- `User.restore()` recebe `isSuperAdmin` dos dois repositórios (PG e SQLite)
- `pnpm --filter backend test:run` passa sem regressões
