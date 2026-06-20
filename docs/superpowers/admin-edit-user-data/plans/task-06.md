# Task 6: Estender `resolvePermissions` com a matriz de autorização [FR-002, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** task-05

## Visão Geral

Estende `resolvePermissions` (em `use-user-detail-actions.ts`) com três novas permissões — `canEditProfile`, `canChangeStatus`, `canChangeRole` — espelhando exatamente a `UserManagementPolicy` do backend, agora usando `isSuperAdmin` (do `AuthUser` e do `AdminUser`, expostos na task 5) em vez do email hardcoded. Essas flags governam, na task 8, quais campos da aba Detalhes ficam editáveis. O backend continua sendo a fonte da verdade (403); estas flags são apenas UX.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts`
- Test (modify/create): `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: espelhar a regra real, não uma aproximação.
- `typescript-advanced`: estender a interface `UserDetailPermissions` com tipos exatos.
- `test-antipatterns`: um teste por célula da matriz; cobrir requester root vs admin comum.
- `security-review`: garantir que o gating de UX não exponha ações proibidas (fail-closed).

## Passos

A nova regra (deve casar com a `UserManagementPolicy`):

- `canEditProfile`: nega self; root → todos; admin comum → só MEMBER não-root.
- `canChangeStatus`: nega se alvo é root; nega self; root → todos; admin comum → só MEMBER.
- `canChangeRole`: nega se alvo é root; nega self; somente root.

> O `currentUser` (do `useAuthStore`) agora tem `isSuperAdmin`; o `AdminUser` (alvo) agora tem `isSuperAdmin`. Use esses flags. Continue tolerando `isSuperAdmin` ausente como `false`.

- **Step 1: Escrever os testes falhos da matriz**

Em `use-user-detail-actions.test.ts` (crie se não existir). Como `resolvePermissions` é interna ao arquivo, exporte-a (ver Step 3) e teste-a diretamente:

```typescript
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { resolvePermissions } from "./use-user-detail-actions"

type Current = { id: string; role: "ADMIN" | "MEMBER"; isSuperAdmin?: boolean }

function target(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "target",
    name: "Target",
    email: "target@test.com",
    role: "MEMBER",
    status: "activated",
    isSuperAdmin: false,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  }
}

const root: Current = { id: "root", role: "ADMIN", isSuperAdmin: true }
const admin: Current = { id: "admin", role: "ADMIN", isSuperAdmin: false }

describe("resolvePermissions — edição de dados", () => {
  test("admin comum pode editar perfil de membro", () => {
    const p = resolvePermissions(target(), admin)
    expect(p.canEditProfile).toBe(true)
  })

  test("admin comum não pode editar perfil de outro admin", () => {
    const p = resolvePermissions(target({ id: "a2", role: "ADMIN" }), admin)
    expect(p.canEditProfile).toBe(false)
  })

  test("root pode editar perfil de admin", () => {
    const p = resolvePermissions(target({ id: "a2", role: "ADMIN" }), root)
    expect(p.canEditProfile).toBe(true)
  })

  test("ninguém edita a si mesmo pelo painel", () => {
    const p = resolvePermissions(target({ id: "admin", role: "ADMIN" }), admin)
    expect(p.canEditProfile).toBe(false)
  })

  test("admin comum altera status de membro mas não de admin", () => {
    expect(resolvePermissions(target(), admin).canChangeStatus).toBe(true)
    expect(resolvePermissions(target({ id: "a2", role: "ADMIN" }), admin).canChangeStatus).toBe(false)
  })

  test("status do super admin é imune", () => {
    const p = resolvePermissions(target({ id: "root2", role: "ADMIN", isSuperAdmin: true }), root)
    expect(p.canChangeStatus).toBe(false)
  })

  test("só root altera role", () => {
    expect(resolvePermissions(target(), admin).canChangeRole).toBe(false)
    expect(resolvePermissions(target(), root).canChangeRole).toBe(true)
  })

  test("role do super admin é imune", () => {
    const p = resolvePermissions(target({ id: "root2", role: "ADMIN", isSuperAdmin: true }), root)
    expect(p.canChangeRole).toBe(false)
  })
})
```

> A assinatura atual de `resolvePermissions(user, currentUserId)` recebe o **id** do current user (string). Esta task muda a assinatura para receber o **objeto** current user (precisa de `role` e `isSuperAdmin`). Ajuste os call sites no mesmo arquivo (ver Step 4).

- **Step 2: Rodar e ver falhar**

Run: `pnpm --filter frontend test -- --run use-user-detail-actions`
Expected: FAIL — `resolvePermissions` não é exportada / novas flags inexistentes.

- **Step 3: Estender a interface e a função**

Em `use-user-detail-actions.ts`:

```typescript
import type { AuthUser } from "@/lib/auth/auth-store"

export interface UserDetailPermissions {
  canSuspend: boolean
  canActivate: boolean
  canPromoteToAdmin: boolean
  canDemoteFromAdmin: boolean
  canDelete: boolean
  isLocked: boolean
  canEditProfile: boolean
  canChangeStatus: boolean
  canChangeRole: boolean
}

function isRoot(user: { isSuperAdmin?: boolean }): boolean {
  return user.isSuperAdmin === true
}

export function resolvePermissions(
  user: AdminUser,
  currentUser: Pick<AuthUser, "id" | "role" | "isSuperAdmin"> | null | undefined,
): UserDetailPermissions {
  const isLocked = user.status === "locked"

  const isSelf = currentUser?.id === user.id
  const requesterIsRoot = currentUser ? isRoot(currentUser) : false
  const requesterIsAdmin = currentUser?.role === "ADMIN"
  const targetIsRoot = isRoot(user)
  const targetIsMember = user.role === "MEMBER"

  const canEditProfile =
    !isSelf &&
    !!currentUser &&
    (requesterIsRoot || (requesterIsAdmin && targetIsMember && !targetIsRoot))

  const canChangeStatus =
    !targetIsRoot &&
    !isSelf &&
    !!currentUser &&
    (requesterIsRoot || (requesterIsAdmin && targetIsMember))

  const canChangeRole = !targetIsRoot && !isSelf && requesterIsRoot

  // Permissões existentes — manter a semântica atual das ações de footer/abas,
  // mas alinhar com a nova regra (status/role agora dependem das flags acima).
  const canSuspend = canChangeStatus && (user.status === "activated" || isLocked)
  const canActivate = canChangeStatus && (user.status === "suspended" || isLocked)
  const canPromoteToAdmin =
    canChangeRole && user.status === "activated" && user.role === "MEMBER"
  const canDemoteFromAdmin = canChangeRole && user.role === "ADMIN"
  const canDelete = !targetIsRoot && !isSelf && requesterIsRoot

  return {
    canSuspend,
    canActivate,
    canPromoteToAdmin,
    canDemoteFromAdmin,
    canDelete,
    isLocked,
    canEditProfile,
    canChangeStatus,
    canChangeRole,
  }
}
```

> Decisão registrada no spec: `canDelete` segue a mesma proteção (não-self, não-root). Se a regra de delete do projeto for diferente da edição, preserve a regra de delete original e ajuste apenas as três novas flags — confirme o comportamento esperado de delete com o teste existente, se houver, antes de alterar.

- **Step 4: Ajustar os call sites de `resolvePermissions` no arquivo**

A chamada interna (hoje `resolvePermissions(user, currentUserId)`) deve passar o objeto do current user:

```typescript
const currentUser = useAuthStore((state) => state.user)
// ...
const permissions = resolvePermissions(user, currentUser)
```

> Localize todos os usos no arquivo com `sg --pattern 'resolvePermissions($$$)' --lang ts apps/frontend/src` e atualize cada um para a nova assinatura (objeto em vez de id).

- **Step 5: Rodar e ver passar**

Run: `pnpm --filter frontend test -- --run use-user-detail-actions`
Expected: PASS.

- **Step 6: Lint, types e suíte do user-detail**

Run: `pnpm --filter frontend lint:fix` → zero issues
Run: `pnpm --filter frontend tsc:check` → zero erros
Run: `pnpm --filter frontend test -- --run user-detail` → PASS (ajuste testes existentes que dependiam da assinatura antiga, se houver).

- **Step 7: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts \
        apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.test.ts
git commit -m "feat(admin): estende resolvePermissions com a matriz de edicao"
```

## Critérios de Sucesso

- `resolvePermissions` expõe `canEditProfile`, `canChangeStatus`, `canChangeRole` espelhando a `UserManagementPolicy` (FR-005..FR-010).
- Usa `isSuperAdmin` do current user e do alvo (não email hardcoded) (FR-002, FR-007).
- Testes cobrem cada célula relevante da matriz e passam; `lint:fix` e `tsc:check` limpos.
