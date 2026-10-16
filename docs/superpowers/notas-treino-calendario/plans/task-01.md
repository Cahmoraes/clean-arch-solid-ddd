# Task 1: Migration e model Prisma de training_notes [FR-001, FR-006]

**Status:** DONE

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** cheap

## Visão Geral

Cria a tabela `training_notes` no Postgres via Prisma: model no schema, migration gerada por comando e client regenerado. É a base de persistência que todas as tasks de backend consomem; nenhuma lógica de aplicação vive aqui.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/*_create_training_notes/migration.sql` (gerado pelo comando de migrate, nunca escrito à mão)

## Interfaces

- **Consome:** N/A
- **Produz:** Prisma client model `TrainingNote` (`id: string`, `userId: string`, `data: DateTime`, `texto: string`, `createdAt: DateTime`, `updatedAt: DateTime`) + tabela `training_notes` com `UNIQUE(user_id, data)` e FK `user_id → users.id onDelete Restrict`

### Skills a invocar

- `find-docs`: exatidão dos comandos Prisma (`migrate:dev`, `prisma:generate`) e da sintaxe do schema

## Passos

- **Step 1: Implementar o model `TrainingNote` em `apps/backend/prisma/schema.prisma`**

  Acrescentar o model exato abaixo e o campo reverso `trainingNotes TrainingNote[]` em `User`. É cópia exata fixada pelo spec (## Dados e Consistência, **Modelo:**), por isso o corpo vai aqui:

  ```prisma
  model TrainingNote {
    id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    userId    String   @map("user_id") @db.Uuid
    data      DateTime @db.Date
    texto     String   @db.VarChar(500)
    createdAt DateTime @map("created_at") @db.Timestamptz
    updatedAt DateTime @map("updated_at") @db.Timestamptz
    user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)

    @@unique([userId, data])
    @@index([userId, data])
    @@map("training_notes")
  }
  ```

- **Step 2: Gerar e aplicar a migration**

  Run: `pnpm --filter backend prisma:migrate:dev` (quando pedir o nome, usar `create_training_notes`)
  Expected: migration `*_create_training_notes/migration.sql` criada e aplicada; saída indica `Your database is now in sync`.

- **Step 3: Regenerar o client Prisma e conferir o model**

  Run: `pnpm --filter backend prisma:generate`
  Expected: geração concluída sem erro e `TrainingNote` acessível no client em `src/shared/infra/database/generated/prisma`.

## Critérios de Sucesso

- Migration `*_create_training_notes/migration.sql` existe, aplica (`up`) e cria `training_notes` com `UNIQUE(user_id, data)`, FK `user_id → users.id` com `onDelete Restrict`, `texto varchar(500)`
- `pnpm --filter backend prisma:generate` passa e o client expõe o model `TrainingNote`
- A tabela nasce vazia; nenhum código antigo a referencia (spec: sem dados legados)
- Base de persistência de FR-001 (criar nota) e FR-006 (isolamento por conta) pronta para as tasks seguintes
