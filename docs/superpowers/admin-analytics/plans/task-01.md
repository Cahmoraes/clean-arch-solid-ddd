# Task 1: Migração — indexes de performance [FR-007, FR-009, FR-011, FR-015]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** N/A

## Visão Geral

Adiciona dois índices compostos na tabela `check_ins` via Prisma schema para suportar as queries de série temporal e distribuição horária dos use cases de analytics sem degradação de performance.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Result: novo arquivo em `apps/backend/prisma/migrations/<timestamp>_add_analytics_indexes/migration.sql`

### Conformidade com as Skills Padrão

- no-workarounds: usar `@@index` do Prisma (não raw SQL) para que o Prisma gerencie a migração

## Passos

- **Step 1: Abrir o schema e localizar o model CheckIn**

```
apps/backend/prisma/schema.prisma  — linhas 32-46
```

O model CheckIn atualmente tem apenas um unique index `check_ins_user_day_unique`. Não há índices em `created_at` isoladamente.

- **Step 2: Adicionar índices no model CheckIn**

Localizar a linha `@@map("check_ins")` dentro do model CheckIn e inserir os índices antes dela:

```prisma
model CheckIn {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  created_at   DateTime  @default(now())
  validated_at DateTime?
  rejected_at  DateTime?
  latitude     Decimal
  longitude    Decimal
  user_id      String    @db.Uuid
  gym_id       String    @db.Uuid
  updated_at   DateTime  @updatedAt
  gym          Gym       @relation(fields: [gym_id], references: [id])
  user         User      @relation(fields: [user_id], references: [id])

  @@index([created_at])
  @@index([user_id, created_at])
  @@map("check_ins")
}
```

- **Step 3: Adicionar índice no model User**

Localizar `@@map("users")` no model User e inserir antes:

```prisma
  @@index([created_at])
  @@map("users")
```

- **Step 4: Gerar e aplicar a migração**

```bash
cd apps/backend
pnpm prisma:migrate:dev --name add_analytics_indexes
```

Expected output:
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database...

The following migration(s) have been created and applied from your Prisma schema changes:

migrations/
  └─ <timestamp>_add_analytics_indexes/
    └─ migration.sql

Your database is now in sync with your schema.
```

- **Step 5: Verificar o arquivo de migração gerado**

```bash
cat apps/backend/prisma/migrations/*add_analytics_indexes*/migration.sql
```

Expected output (aproximado):
```sql
-- CreateIndex
CREATE INDEX "check_ins_created_at_idx" ON "check_ins"("created_at");

-- CreateIndex
CREATE INDEX "check_ins_user_id_created_at_idx" ON "check_ins"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
```

- **Step 6: Verificar TypeScript sem erros**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro TypeScript.

- **Step 7: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(analytics): add db indexes for analytics time-series queries"
```

## Critérios de Sucesso

- Migration file gerado em `prisma/migrations/`
- `pnpm --filter backend tsc:check` passa sem erros
- `@@index([created_at])` e `@@index([user_id, created_at])` presentes no model CheckIn
- `@@index([created_at])` presente no model User
