# Task 1: Policy de domínio `UserManagementPolicy` + erro de autorização [FR-005, FR-006, FR-007, FR-008, FR-009, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-admin-edit-user-data.md`
**Spec:** `../specs/admin-edit-user-data-design.md`
**Depends on:** N/A

## Visão Geral

Cria o componente central da feature: uma policy de domínio **pura** (sem I/O, métodos estáticos) que responde se um `requester` pode alterar cada aspecto (perfil, status, role) de um `target`. Cria também o erro de domínio de autorização que, por ter `kind: "forbidden"`, é mapeado automaticamente para HTTP 403 pelo `BaseController` via `STATUS_BY_ERROR_KIND`.

Esta task NÃO altera use cases — apenas entrega a policy e o erro, consumidos pelas tasks 2, 3 e 4.

## Arquivos

- Create: `apps/backend/src/user/domain/service/user-management-policy.ts`
- Create: `apps/backend/src/user/domain/service/user-management-policy.test.ts`
- Create: `apps/backend/src/user/application/error/not-allowed-to-manage-user-error.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a regra de autorização é segurança — nada de atalhos; cada célula da matriz deve ser implementada explicitamente.
- `typescript-advanced`: assinaturas precisas (parâmetros `User`, retorno `boolean`), sem `any`.
- `security-review`: é uma regra de autorização; revisar para garantir que nenhuma combinação proibida passe (fail-closed por padrão).
- `test-antipatterns`: um teste por célula da matriz, sem testes acoplados a detalhes irrelevantes.

## Passos

A matriz que a policy implementa (do spec):

- `canEditProfile(requester, target)` — nome/email: nega self (FR-010); root pode todos (FR-007); admin comum só MEMBER não-root (FR-005); senão nega (FR-006).
- `canChangeStatus(requester, target)` — suspend/activate: nega se target é super admin (FR-009); nega self; root pode todos (FR-007); admin comum só MEMBER (FR-005); senão nega (FR-006).
- `canChangeRole(requester, target)` — promote/demote: nega se target é super admin (FR-009); nega self; só root (FR-008/FR-007); senão nega (FR-006).

- **Step 1: Escrever o teste falho da policy**

Create `apps/backend/src/user/domain/service/user-management-policy.test.ts`:

```typescript
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status/user-status"
import { UserManagementPolicy } from "./user-management-policy"

function makeUser(props: {
  id: string
  role: RoleTypes
  isSuperAdmin?: boolean
  status?: StatusTypes
}): User {
  return User.restore({
    id: props.id,
    name: "Test User",
    email: `${props.id}@test.com`,
    password: "hashed_password",
    role: props.role,
    status: props.status ?? "activated",
    createdAt: new Date(),
    isSuperAdmin: props.isSuperAdmin ?? false,
  })
}

const root = makeUser({ id: "root", role: "ADMIN", isSuperAdmin: true })
const admin = makeUser({ id: "admin", role: "ADMIN" })
const otherAdmin = makeUser({ id: "other-admin", role: "ADMIN" })
const member = makeUser({ id: "member", role: "MEMBER" })

describe("UserManagementPolicy.canEditProfile", () => {
  test("nega editar a si mesmo (usa-se o perfil próprio)", () => {
    expect(UserManagementPolicy.canEditProfile(admin, admin)).toBe(false)
  })

  test("root edita qualquer um", () => {
    expect(UserManagementPolicy.canEditProfile(root, member)).toBe(true)
    expect(UserManagementPolicy.canEditProfile(root, otherAdmin)).toBe(true)
  })

  test("admin comum edita membro", () => {
    expect(UserManagementPolicy.canEditProfile(admin, member)).toBe(true)
  })

  test("admin comum não edita outro admin nem o root", () => {
    expect(UserManagementPolicy.canEditProfile(admin, otherAdmin)).toBe(false)
    expect(UserManagementPolicy.canEditProfile(admin, root)).toBe(false)
  })

  test("membro não edita ninguém pelo painel", () => {
    expect(UserManagementPolicy.canEditProfile(member, member)).toBe(false)
  })
})

describe("UserManagementPolicy.canChangeStatus", () => {
  test("nega alterar status do super admin", () => {
    expect(UserManagementPolicy.canChangeStatus(root, root)).toBe(false)
    expect(UserManagementPolicy.canChangeStatus(admin, root)).toBe(false)
  })

  test("root altera status de membro e de admin", () => {
    expect(UserManagementPolicy.canChangeStatus(root, member)).toBe(true)
    expect(UserManagementPolicy.canChangeStatus(root, otherAdmin)).toBe(true)
  })

  test("admin comum altera status de membro, não de admin", () => {
    expect(UserManagementPolicy.canChangeStatus(admin, member)).toBe(true)
    expect(UserManagementPolicy.canChangeStatus(admin, otherAdmin)).toBe(false)
  })

  test("nega alterar o próprio status", () => {
    expect(UserManagementPolicy.canChangeStatus(admin, admin)).toBe(false)
  })
})

describe("UserManagementPolicy.canChangeRole", () => {
  test("apenas o root altera role", () => {
    expect(UserManagementPolicy.canChangeRole(root, member)).toBe(true)
    expect(UserManagementPolicy.canChangeRole(root, otherAdmin)).toBe(true)
  })

  test("admin comum nunca altera role", () => {
    expect(UserManagementPolicy.canChangeRole(admin, member)).toBe(false)
    expect(UserManagementPolicy.canChangeRole(admin, otherAdmin)).toBe(false)
  })

  test("nega alterar role do super admin", () => {
    expect(UserManagementPolicy.canChangeRole(root, root)).toBe(false)
  })

  test("root não altera o próprio role", () => {
    const anotherRoot = makeUser({ id: "root", role: "ADMIN", isSuperAdmin: true })
    expect(UserManagementPolicy.canChangeRole(root, anotherRoot)).toBe(false)
  })
})
```

- **Step 2: Rodar o teste e ver falhar**

Run: `pnpm --filter backend test:run -- user-management-policy`
Expected: FAIL — "Cannot find module './user-management-policy'".

> Observação sobre o status do target em `makeUser`: confirme o tipo `StatusTypes` e o caminho de import real do status VO com `sg --pattern 'export type StatusTypes' --lang ts apps/backend/src`. Se o caminho diferir de `@/user/domain/value-object/status/user-status`, ajuste o import no teste antes do Step 4.

- **Step 3: Implementar a policy**

Create `apps/backend/src/user/domain/service/user-management-policy.ts`:

```typescript
import type { User } from "@/user/domain/user"

/**
 * Regra de autorização para gestão de usuários por administradores.
 * Pura: depende apenas das entidades; sem I/O. Fail-closed por padrão.
 *
 * - Root (isSuperAdmin) pode gerenciar todos.
 * - Admin comum gerencia apenas membros (MEMBER), nunca outros admins.
 * - Alteração de role é exclusiva do root.
 * - O super admin é imune a alteração de status/role.
 * - Ninguém gerencia a si mesmo pelo painel (auto-edição é via perfil próprio).
 */
export class UserManagementPolicy {
  private static isSelf(requester: User, target: User): boolean {
    return requester.id === target.id
  }

  private static isRoot(user: User): boolean {
    return user.isSuperAdmin
  }

  private static canManageMember(requester: User, target: User): boolean {
    return requester.role === "ADMIN" && target.role === "MEMBER"
  }

  public static canEditProfile(requester: User, target: User): boolean {
    if (this.isSelf(requester, target)) return false
    if (this.isRoot(requester)) return true
    if (this.isRoot(target)) return false
    return this.canManageMember(requester, target)
  }

  public static canChangeStatus(requester: User, target: User): boolean {
    if (this.isRoot(target)) return false
    if (this.isSelf(requester, target)) return false
    if (this.isRoot(requester)) return true
    return this.canManageMember(requester, target)
  }

  public static canChangeRole(requester: User, target: User): boolean {
    if (this.isRoot(target)) return false
    if (this.isSelf(requester, target)) return false
    return this.isRoot(requester)
  }
}
```

- **Step 4: Rodar o teste e ver passar**

Run: `pnpm --filter backend test:run -- user-management-policy`
Expected: PASS — todos os blocos `describe` verdes.

- **Step 5: Criar o erro de autorização de domínio**

Create `apps/backend/src/user/application/error/not-allowed-to-manage-user-error.ts`:

```typescript
import { DomainError } from "@/shared/domain/error/domain-error"

export class NotAllowedToManageUserError extends DomainError {
  public readonly kind = "forbidden" as const

  constructor(errorOptions?: ErrorOptions) {
    super("You are not allowed to manage this user", errorOptions)
    this.name = "NotAllowedToManageUserError"
  }
}
```

> Confirme o caminho real da classe base `DomainError` com `sg --pattern 'export abstract class DomainError' --lang ts apps/backend/src`. A pesquisa indicou `@/shared/domain/error/domain-error`; ajuste o import se necessário.

- **Step 6: Validar lint, types e a suíte afetada**

Run: `pnpm --filter backend biome:fix`
Expected: zero issues.

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend test:run -- user-management-policy`
Expected: PASS.

- **Step 7: Commit**

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/backend/src/user/domain/service/user-management-policy.ts \
        apps/backend/src/user/domain/service/user-management-policy.test.ts \
        apps/backend/src/user/application/error/not-allowed-to-manage-user-error.ts
git commit -m "feat(user): adiciona UserManagementPolicy e erro de autorizacao"
```

## Critérios de Sucesso

- `UserManagementPolicy` implementa `canEditProfile`, `canChangeStatus` e `canChangeRole` cobrindo toda a matriz do spec (FR-005, FR-006, FR-007, FR-008, FR-009, FR-010).
- A policy é pura (sem dependências/I/O) e 100% coberta por testes unitários, um por célula relevante.
- `NotAllowedToManageUserError` tem `kind = "forbidden"` (mapeia para HTTP 403).
- `pnpm --filter backend biome:fix`, `tsc:check` e os testes da policy passam.
