# Task 1: Migration Prisma — enum `GymStatus` (activated/deactivated) + campo `status` em `Gym` [FR-011]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Adiciona ao schema Prisma o novo enum `GymStatus` (com exatamente dois valores: `activated` e
`deactivated`) e um campo `status` no modelo `Gym`, com default `activated`. Essa é a base de
persistência que todas as demais tasks do backend (entidade, repositório, use cases,
controllers) dependem para ler/gravar o status de uma academia. Não escreve teste unitário
próprio — é infraestrutura de schema; a garantia de que a migration funciona corretamente é
validada pelas Tasks 4-6, que persistem e leem o campo `status` de fato através do
`PrismaGymRepository`.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_add_gym_status/migration.sql` (gerado via
  `prisma migrate dev`, não escrito à mão)

### Conformidade com as Skills Padrão

Nenhuma skill de domínio específica para Prisma/schema/migrations foi encontrada disponível
neste ambiente (o skills-lock.json de `apps/backend` e a listagem de skills do ambiente não
incluem uma skill de Prisma/banco de dados). Categoria mínima aplicável, sem skill nomeada
correspondente: Backend/Prisma/Banco de dados — alteração de `schema.prisma` (novo enum, novo
campo com default) e geração de migration via `prisma migrate dev`, seguindo a convenção já
usada pelo enum `UserStatus` existente no mesmo arquivo.

## Passos

- **Step 1: Modificar o schema.prisma (não há teste automatizado para este step — é
  infraestrutura de schema validada pelas Tasks 4-6)**

  Modelo `Gym` atual (linhas 51-66 de `apps/backend/prisma/schema.prisma`):

  ```prisma
  model Gym {
    id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    cnpj        String    @unique
    title       String
    description String?
    phone       String?
    address     String?
    image_key   String?
    latitude    Decimal
    longitude   Decimal
    created_at  DateTime  @default(now())
    updated_at  DateTime  @updatedAt
    checkIns    CheckIn[]

    @@map("gyms")
  }
  ```

  Alterar para (adicionar `status GymStatus @default(activated)`):

  ```prisma
  model Gym {
    id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    cnpj        String    @unique
    title       String
    description String?
    phone       String?
    address     String?
    image_key   String?
    latitude    Decimal
    longitude   Decimal
    status      GymStatus @default(activated)
    created_at  DateTime  @default(now())
    updated_at  DateTime  @updatedAt
    checkIns    CheckIn[]

    @@map("gyms")
  }
  ```

  Adicionar o novo enum (mesma convenção do `enum UserStatus` já existente no schema, linhas
  139-143), em qualquer ponto do arquivo próximo aos demais enums:

  ```prisma
  enum GymStatus {
    activated
    deactivated
  }
  ```

  **Atenção:** o enum tem exatamente dois valores (`activated`, `deactivated`) — NÃO replicar
  os três valores de `UserStatus` (`activated/suspended/locked`); `Gym` não tem estado
  "suspenso" ou "bloqueado", apenas ativo/desativado.

- **Step 2: Gerar a migration**

  Convenção de nome: `YYYYMMDDHHMMSS_descriptive_name` (a mais recente hoje é
  `20260606131640_add_gym_image_key`). Usar um timestamp posterior, por exemplo
  `20260731150000` (ajustar minutos/segundos se colidir com uma migration já existente no
  momento da execução).

  Run:
  ```bash
  cd apps/backend && npx prisma migrate dev --name add_gym_status
  ```
  Expected: cria a pasta `apps/backend/prisma/migrations/<timestamp>_add_gym_status/` com o
  `migration.sql` gerado (contendo `CREATE TYPE "GymStatus"` e
  `ALTER TABLE "gyms" ADD COLUMN "status" "GymStatus" NOT NULL DEFAULT 'activated'`), roda
  `prisma generate` sem erros, e todas as linhas já existentes na tabela `gyms` recebem
  `status = 'activated'` automaticamente pelo `DEFAULT`.

- **Step 3: Confirmar que o client gerado expõe o novo campo/enum**

  Run:
  ```bash
  cd apps/backend && npx tsc --noEmit
  ```
  Expected: PASS (sem erros de tipo) — o client Prisma gerado em
  `apps/backend/src/shared/infra/database/generated/prisma/client` agora exporta o tipo/enum
  `GymStatus` e o campo `status` no tipo `Gym` gerado, o que será consumido pelas Tasks 4-6.

- **Step 4: Rodar a suíte de testes existente para garantir que nada quebrou**

  Run: `pnpm --filter backend test:run`
  Expected: PASS — nenhum teste existente depende do novo campo ainda, então a suíte inteira
  deve continuar passando sem alterações adicionais.

- **Step 5: Commit**

  ```bash
  git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
  git commit -m "feat(gym): add GymStatus enum and status column to Gym model"
  ```

## Critérios de Sucesso

- `schema.prisma` define `enum GymStatus { activated deactivated }` com exatamente dois
  valores (FR-011).
- O modelo `Gym` tem o campo `status GymStatus @default(activated)`.
- A migration gerada em `apps/backend/prisma/migrations/<timestamp>_add_gym_status/` aplica
  `DEFAULT 'activated'`, preservando o comportamento de todas as academias já cadastradas
  (nenhuma linha existente fica com `status` nulo).
- `npx prisma generate` roda sem erros e o client TypeScript gerado expõe `status` no tipo
  `Gym` e o enum `GymStatus`.
- `pnpm --filter backend test:run` continua passando sem nenhuma alteração de código de
  aplicação.
