# Task 5: Migração Prisma: coluna rejected_at [RF-005]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Adicionar a coluna `rejected_at DateTime?` ao model `CheckIn` no schema Prisma e gerar/aplicar a migração.

**Depende de:** Task 3

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_add_rejected_at_to_check_ins/migration.sql` (gerado automaticamente)

## Passos

- [ ] **Step 1: Atualizar o model CheckIn no schema.prisma**

Em `apps/backend/prisma/schema.prisma`, localizar o model `CheckIn` e adicionar o campo `rejected_at`:

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

  @@map("check_ins")
}
```

- [ ] **Step 2: Verificar que os serviços Docker estão rodando**

```bash
pnpm --filter backend docker:up
```

Aguardar o banco de dados estar disponível (PostgreSQL na porta padrão).

- [ ] **Step 3: Gerar e aplicar a migração**

```bash
pnpm --filter backend prisma:migrate:dev -- --name add_rejected_at_to_check_ins
```

Esperado: migração criada em `prisma/migrations/` e aplicada ao banco.

- [ ] **Step 4: Verificar que o Prisma Client foi regenerado**

```bash
ls apps/backend/prisma/migrations/ | tail -1
```

O nome da última migration deve conter `add_rejected_at_to_check_ins`.

- [ ] **Step 5: Confirmar que o campo existe no client gerado**

```bash
grep "rejected_at" apps/backend/src/shared/infra/database/generated/prisma/client/index.d.ts | head -5
```

Esperado: pelo menos uma linha com `rejected_at`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/prisma/schema.prisma \
        apps/backend/prisma/migrations/ \
        apps/backend/src/shared/infra/database/generated/
git commit -m "feat(check-in): add rejected_at column to check_ins table
```

## Critérios de Sucesso

- Schema Prisma tem `rejected_at DateTime?` no model `CheckIn`
- Migration SQL está em `prisma/migrations/`
- Prisma Client gerado inclui o campo `rejected_at`
- Banco de dados tem a coluna `rejected_at` na tabela `check_ins`
