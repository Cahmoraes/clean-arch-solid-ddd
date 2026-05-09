# Task 1: Schema Prisma + Variável de Ambiente [RF-011, RF-012]

**Status:** DONE
**PRD:** `../prd/prd-google-social-login.md`
**Spec:** `../specs/google-social-login-design.md`

## Visão Geral

Adicionar o campo `google_id` (nullable, unique) à tabela `users` no Prisma e tornar `password_hash` nullable. Instalar a dependência `google-auth-library`. Adicionar `GOOGLE_CLIENT_ID` ao schema de validação de env.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `apps/backend/src/shared/infra/env/index.ts`
- Modify: `apps/backend/.env` (adicionar GOOGLE_CLIENT_ID)
- Modify: `apps/backend/.env.example` (adicionar GOOGLE_CLIENT_ID, se existir)

## Passos

- [ ] **Step 1: Instalar google-auth-library**

```bash
pnpm --filter backend add google-auth-library
```

- [ ] **Step 2: Adicionar campos ao schema Prisma**

Em `apps/backend/prisma/schema.prisma`, no model `User`:

```prisma
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

  checkIns     CheckIn[]
  subscription Subscription[]

  @@map("users")
}
```

Mudanças:
- `password_hash` de `String` para `String?`
- Novo campo `google_id String? @unique`

- [ ] **Step 3: Gerar migration Prisma**

```bash
cd apps/backend && pnpm prisma migrate dev --name add-google-social-login
```

Esperado: migration criada com sucesso, adicionando coluna `google_id` e tornando `password_hash` nullable.

- [ ] **Step 4: Adicionar GOOGLE_CLIENT_ID ao env schema**

Em `apps/backend/src/shared/infra/env/index.ts`, adicionar ao `envSchema`:

```typescript
GOOGLE_CLIENT_ID: z.string().optional(),
```

O campo é `optional()` para não quebrar ambientes existentes que ainda não configuraram. O Use Case validará em runtime.

- [ ] **Step 5: Adicionar GOOGLE_CLIENT_ID ao .env**

```
GOOGLE_CLIENT_ID=REDACTED_GOOGLE_CLIENT_ID
```

- [ ] **Step 6: Verificar que o build passa**

```bash
pnpm --filter backend tsc:check
```

Esperado: sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/prisma apps/backend/src/shared/infra/env apps/backend/package.json apps/backend/.env.example pnpm-lock.yaml
git commit -m "feat(backend): add google_id to user schema and install google-auth-library"
```
