# Task 5: Expor `isSuperAdmin` no JWT e na resposta de GET /users [FR-002, FR-007]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** N/A

## Visão Geral

Habilita o frontend a distinguir o **root** (admin@admin) de um admin comum, dado necessário para o `resolvePermissions` (task 6) e para o gating dos campos editáveis (task 8). Hoje o `AuthUser` do frontend só tem `{ id, role }` e ambos os admins têm `role: "ADMIN"`. Esta task propaga o flag `isSuperAdmin` (que já existe no Prisma e na entidade `User`) em dois caminhos: (1) claims do JWT → `AuthUser`; (2) DTO de `GET /users` → `AdminUser`. Ao final, regenera os tipos compartilhados.

Esta task é puramente aditiva (campos novos opcionais/booleanos) e não altera autorização — é independente das tasks 1–4.

## Arquivos

Backend:
- Modify: `apps/backend/src/session/application/use-case/authenticate.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/fetch-users.controller.ts`
- Modify: `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts`

Frontend:
- Modify: `apps/frontend/src/lib/jwt.ts`
- Modify: `apps/frontend/src/lib/auth/auth-store.ts`
- Modify: `apps/frontend/src/lib/auth/schemas.ts`

Tipos:
- Generated: `packages/api-types/index.d.ts` (via `pnpm generate:types`)

### Conformidade com as Skills Padrão

- `no-workarounds`: propagar o flag corretamente em vez de hardcode de email no front.
- `zod`: schema do `userItemSchema` (OpenAPI) e do `sessionUserSchema`.
- `typescript-advanced`: estender interfaces de payload/DTO sem `any`.
- `zustand`: o `AuthUser` é derivado no store — manter a forma do estado consistente.
- `test-antipatterns`: testes de decode do JWT e do DTO sem mocks frágeis.

## Passos

- **Step 1: Incluir `isSuperAdmin` no payload do JWT (backend)**

Em `authenticate.usecase.ts`, no método `signUserToken`:

```typescript
private signUserToken(user: User, jwi: string): string {
  return this.authToken.sign(
    {
      sub: {
        id: user.id,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        jwi,
      },
    },
    env.PRIVATE_KEY,
  )
}
```

> Se houver geração de token também no refresh ou em outro fluxo (ex: register), inclua `isSuperAdmin` lá igualmente. Localize com `sg --pattern 'this.authToken.sign($$$)' --lang ts apps/backend/src` e `sg --pattern 'sub: { $$$ }' --lang ts apps/backend/src`.

- **Step 2: Adicionar `is_super_admin` ao DAO Prisma de fetch-users**

Em `prisma-user-dao.ts`, no `fetchAndCountUsers`, adicione ao `select` e ao mapping:

```typescript
select: {
  email: true,
  id: true,
  name: true,
  role: true,
  status: true,
  created_at: true,
  is_super_admin: true,
},
// ...
usersData: usersData.map((u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  status: u.status,
  isSuperAdmin: u.is_super_admin,
  createdAt: u.created_at.toISOString(),
})),
```

- **Step 3: Adicionar `isSuperAdmin` à interface do use case**

Em `fetch-users.usecase.ts`, na interface `FetchUsersData`:

```typescript
export interface FetchUsersData {
  id: string
  role: RoleTypes
  status: StatusTypes
  createdAt: string
  name: string
  email: string
  isSuperAdmin: boolean
}
```

- **Step 4: Adicionar `isSuperAdmin` ao schema OpenAPI da resposta**

Em `fetch-users.controller.ts`, no `userItemSchema`:

```typescript
const userItemSchema = z.object({
  id: z.uuid().meta({ description: "User ID" }),
  name: z.string().meta({ description: "User full name" }),
  email: z.email().meta({ description: "User email" }),
  role: z.enum(["ADMIN", "MEMBER"]).meta({ description: "User role" }),
  isSuperAdmin: z.boolean().meta({ description: "Is super admin", example: false }),
  status: z.enum(["activated", "suspended", "locked"]).meta({ description: "User status" }),
  createdAt: z.string().meta({ description: "User creation date" }),
})
```

> Garanta que o controller realmente repassa `isSuperAdmin` do use case para a resposta. Se o controller monta o objeto de resposta manualmente, inclua `isSuperAdmin: u.isSuperAdmin` no map. Confirme com `sg --pattern 'users: $USERS.map($$$)' --lang ts apps/backend/src/user/infra/controller/fetch-users.controller.ts`.

- **Step 5: Validar backend (lint, types, teste do fetch-users)**

Run: `pnpm --filter backend prisma:generate` (garante o client Prisma atualizado para o novo `select`)
Run: `pnpm --filter backend biome:fix` → zero issues
Run: `pnpm --filter backend tsc:check` → zero erros
Run: `pnpm --filter backend test:run -- fetch-users` → PASS (ajuste expectativas de teste que comparam o objeto do usuário para incluir `isSuperAdmin`, se houver).

- **Step 6: Regenerar os tipos compartilhados**

Run: `pnpm generate:types`
Expected: `packages/api-types/index.d.ts` regenerado; o type da resposta de `GET /users` agora inclui `isSuperAdmin: boolean`.

Confirme: `sg --pattern 'isSuperAdmin' --lang ts packages/api-types/index.d.ts` deve retornar ao menos uma ocorrência.

- **Step 7: Estender o decode do JWT (frontend)**

Em `apps/frontend/src/lib/jwt.ts`:

```typescript
export interface JwtPayload {
  sub: string
  role: "MEMBER" | "ADMIN"
  isSuperAdmin?: boolean
  exp: number
}
```

> Verifique a função `normalizeClaims`/`parsePayload`: o claim do backend é aninhado em `sub: { id, role, isSuperAdmin }`. Confira como o frontend hoje extrai `sub` e `role` (a interface atual expõe `sub: string` e `role` no topo). Replique o mesmo caminho de extração para `isSuperAdmin` — ou seja, leia `isSuperAdmin` do mesmo objeto de onde `role` é lido. Confirme com `sg --pattern 'function normalizeClaims($$$)' --lang ts apps/frontend/src/lib/jwt.ts` e ajuste a extração para popular `isSuperAdmin`.

- **Step 8: Teste do decode (frontend)**

Em `apps/frontend/src/lib/jwt.test.ts` (crie se não existir; veja um teste existente em `src/lib` para o padrão de import do vitest):

```typescript
import { describe, expect, test } from "vitest"
import { decodeJwt } from "./jwt"

function makeToken(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.signature`
}

describe("decodeJwt", () => {
  test("extrai isSuperAdmin do payload", () => {
    const token = makeToken({
      sub: { id: "u1", role: "ADMIN", isSuperAdmin: true },
      role: "ADMIN",
      exp: Math.floor(9999999999),
    })
    const payload = decodeJwt(token)
    expect(payload?.isSuperAdmin).toBe(true)
  })
})
```

> Ajuste a forma das claims no `makeToken` para corresponder exatamente ao que `normalizeClaims` espera (a estrutura real do token do backend é `sub: { id, email, role, isSuperAdmin, jwi }`). O objetivo do teste é travar a extração de `isSuperAdmin`.

- **Step 9: Propagar `isSuperAdmin` para o `AuthUser` (frontend)**

Em `apps/frontend/src/lib/auth/auth-store.ts`:

```typescript
export interface AuthUser {
  id: string
  role: "MEMBER" | "ADMIN"
  isSuperAdmin?: boolean
}

// no setSession, ao montar o user:
const user: AuthUser = {
  id: payload.sub,
  role: payload.role,
  isSuperAdmin: payload.isSuperAdmin,
}
```

Em `apps/frontend/src/lib/auth/schemas.ts`:

```typescript
export const sessionUserSchema = z.object({
  id: z.string(),
  role: z.enum(["MEMBER", "ADMIN"]),
  isSuperAdmin: z.boolean().optional(),
})
```

- **Step 10: Validar frontend (lint, types, testes)**

Run: `pnpm --filter frontend lint:fix` → zero issues
Run: `pnpm --filter frontend tsc:check` → zero erros
Run: `pnpm --filter frontend test -- --run jwt auth` → PASS

- **Step 11: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/backend/src/session/application/use-case/authenticate.usecase.ts \
        apps/backend/src/user/infra/controller/fetch-users.controller.ts \
        apps/backend/src/user/application/use-case/fetch-users.usecase.ts \
        apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.ts \
        apps/frontend/src/lib/jwt.ts apps/frontend/src/lib/jwt.test.ts \
        apps/frontend/src/lib/auth/auth-store.ts apps/frontend/src/lib/auth/schemas.ts \
        packages/api-types/index.d.ts
git commit -m "feat: expoe isSuperAdmin no JWT e no DTO de usuarios"
```

## Critérios de Sucesso

- O JWT inclui `isSuperAdmin`; `AuthUser` e `JwtPayload` expõem `isSuperAdmin` (FR-007 — front sabe se o usuário logado é root).
- `GET /users` retorna `isSuperAdmin` por usuário; `@repo/api-types` regenerado reflete o campo (FR-002 — front sabe se o alvo é root).
- Backend e frontend passam em `biome:fix`/`lint:fix`, `tsc:check` e nos testes afetados.
